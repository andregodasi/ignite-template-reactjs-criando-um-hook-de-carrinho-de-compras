import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const getItemStock = async (productId: number): Promise<Stock> => {
    const resp = await api.get<Stock>(`/stock/${productId}`);
    return resp.data;
  };

  const getProduct = async (productId: number): Promise<Product> => {
    const resp = await api.get<Product>(`/products/${productId}`);
    return resp.data;
  };

  const getItemCart = (productId: number): Product | undefined => {
    return cart.find((product) => product.id === productId);
  };

  const saveCart = (products: Product[]): void => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));
    setCart([...products]);
  };

  const addProduct = async (productId: number) => {
    try {
      const itemStockData = await getItemStock(productId);
      const itemCart = getItemCart(productId);
      if (itemCart && itemCart.amount >= itemStockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      let products: Product[];
      if (itemCart) {
        products = cart.map((product) => {
          if (product.id === productId) {
            return { ...product, amount: product.amount + 1 };
          }
          return product;
        });
      } else {
        const productData = await getProduct(productId);
        products = [...cart, { ...productData, amount: 1 }];
      }

      saveCart(products);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((product) => product.id === productId)) {
        throw new Error("invalid id");
      }
      const products = cart.filter((product) => product.id !== productId);
      saveCart(products);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error("A quantidade do produto deve ser maior que 0");
        return;
      }

      const itemStock = await getItemStock(productId);
      if (itemStock.amount <= amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const products = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount: amount };
        }

        return product;
      });

      saveCart(products);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
