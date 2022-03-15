import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const stock = await api.get(`/stock/${productId}`)

      if (stock.data.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {
        const stock = await api.get(`/stock/${productId}`)
        const productInCart = cart.find(product => product.id === productId)

        if (!productInCart && stock.data.amount > 0) {
          const product = await api.get(`/products/${productId}`)
          setCart(cart => {
            const newCart = [...cart, { ...product.data, amount: 1 }]
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
            return newCart
          })
        } else if (productInCart && stock.data.amount > productInCart.amount) {
          updateProductAmount({
            productId,
            amount: (productInCart.amount += 1),
          })
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)
      if (product) {
        const cartFiltered = cart.filter(product => product.id !== productId)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartFiltered))
        setCart(cartFiltered)
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount < 1) {
      return false
    }

    try {
      const stock = await api.get(`/stock/${productId}`)
      const productInCart = cart.find(product => product.id === productId)
      if (stock.data.amount <= 0) {
        return false
      }

      if (productInCart && stock.data.amount >= amount) {
        const cartFiltered = cart.filter(product => product.id !== productId)
        setCart(cart => {
          const newCart = [
            ...cartFiltered,
            { ...productInCart, amount: amount },
          ]
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
          return newCart
        })
      } else {
        toast.error('Quantidade solicitada fora de estoque')
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
