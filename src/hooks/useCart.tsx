import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
import { useEffect } from 'react';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(()=>{
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(()=>{
    if (cartPreviousValue !== cart) localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {

      const copyCart = [...cart];

      const productCart = copyCart.find((prod) => prod.id === productId);         
      
      const stock = await api.get(`stock/${productId}`);
      
      const stockAmount = stock.data.amount;
      const currentAmount = productCart ? productCart.amount : 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productCart){
        productCart.amount = amount;      
      }else{
        const {data: product} = await api.get(`products/${productId}`);   
        copyCart.push({...product, amount: 1});
      }
      setCart(copyCart);        
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const copyCart = [ ...cart ] ;
      const removedProductIndex = copyCart.findIndex(product => product.id === productId);
      
      if( removedProductIndex < 0 ) throw Error();
      
      copyCart.splice(removedProductIndex, 1);
      setCart(copyCart);
    } catch(e) {
      toast.error('Erro na remoção do produto');      
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }
      const stock = await api.get(`/stock/${productId}`);
      
      const stockAmount = stock.data.amount;
      
      if( amount > stockAmount ){ 
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      

      const copyCart = [ ...cart ];
      const updatedProduct = copyCart.find(product => product.id === productId);

      if( !updatedProduct ) throw new Error();

      updatedProduct.amount = amount;

      setCart(copyCart);        

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
