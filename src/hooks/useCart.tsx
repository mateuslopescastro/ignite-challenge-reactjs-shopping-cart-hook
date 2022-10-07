import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { api } from "../services/api"
import { Product, Stock } from "../types"

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart) as Product[]
    }

    return []
  })

  const previousCartRef = useRef<Product[]>()

  useEffect(() => {
    previousCartRef.current = cart
  })

  const previousCartValue = previousCartRef.current ?? cart

  useEffect(() => {
    if (previousCartValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart))
    }
  }, [cart, previousCartValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productExists = updatedCart.find((product) => product.id === productId)

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1

      console.log("currentAmount", currentAmount)
      console.log("amount", amount)
      console.log("stock.amount", stock.amount)

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque")
        return
      }

      if (productExists) {
        productExists.amount = amount
      } else {
        const { data: product } = await api.get(`/products/${productId}`)

        updatedCart.push({
          ...product,
          amount: 1
        })
      }

      setCart(updatedCart)
    } catch {
      toast.error("Erro na adição do produto")
    }
  }

  const removeProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex((product) => product.id === productId)

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1)

        setCart(updatedCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error("Erro na remoção do produto")
    }
  }

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque")
        return
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find((product) => product.id === productId)

      if (!productExists) {
        throw Error()
      }

      productExists.amount = amount

      setCart(updatedCart)
    } catch {
      toast.error("Erro na alteração de quantidade do produto")
    }
  }

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
