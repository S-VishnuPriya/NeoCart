import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Cart } from '../types.js';
import { useToast } from './ToastContext.js';
import { useAuth } from './AuthContext.js';

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  isCartOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get('/cart');
      if (res.data?.success) {
        setCart(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch active cart', err);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, isAuthenticated]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addToCart = async (productId: string, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const res = await api.post('/cart/items', { productId, quantity });
      if (res.data?.success) {
        setCart(res.data.data);
        showToast('Item added to cart!', 'success');
        openCart();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Could not add item to cart.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      const res = await api.patch(`/cart/items/${productId}`, { quantity });
      if (res.data?.success) {
        setCart(res.data.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Could not update quantity.';
      showToast(msg, 'error');
    }
  };

  const removeItem = async (productId: string) => {
    try {
      const res = await api.delete(`/cart/items/${productId}`);
      if (res.data?.success) {
        setCart(res.data.data);
        showToast('Item removed from cart.', 'info');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Could not remove item.';
      showToast(msg, 'error');
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart');
      setCart((prev) => (prev ? { ...prev, items: [], summary: { itemCount: 0, subtotal: 0, taxAmount: 0, shippingCost: 0, grandTotal: 0, freeShippingThreshold: 100, qualifiesForFreeShipping: false } } : null));
      showToast('Cart cleared.', 'info');
    } catch (err: any) {
      showToast('Failed to clear cart.', 'error');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount: cart?.summary?.itemCount || 0,
        isCartOpen,
        isLoading,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
