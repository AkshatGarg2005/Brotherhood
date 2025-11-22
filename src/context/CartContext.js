import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // Load cart from localStorage to persist on refresh
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('brotherhood_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cartShop, setCartShop] = useState(() => {
    const saved = localStorage.getItem('brotherhood_cart_shop');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('brotherhood_cart', JSON.stringify(cart));
    localStorage.setItem('brotherhood_cart_shop', JSON.stringify(cartShop));
  }, [cart, cartShop]);

  const addToCart = (product, shop) => {
    // Validation: Can only buy from one shop at a time
    if (cartShop && cartShop.id !== shop.id) {
      if (!window.confirm(`Your cart contains items from ${cartShop.displayName}. Clear cart to add items from ${shop.displayName}?`)) {
        return;
      }
      clearCart();
    }

    setCartShop(shop);
    
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const newCart = prev.filter(p => p.id !== productId);
      if (newCart.length === 0) setCartShop(null);
      return newCart;
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
        return prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        });
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartShop(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, cartShop, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};