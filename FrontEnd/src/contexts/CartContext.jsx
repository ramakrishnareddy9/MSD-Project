import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const CART_STORAGE_KEY = 'farmkart_cart';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
  }, []);

  // Calculate total whenever cart changes
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => {
      const itemPrice = item.finalPrice || item.price || 0;
      const itemQuantity = item.qty || item.quantity || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0);
    setTotal(newTotal);

    // Save to localStorage
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      
      // Calculate discounted price if applicable
      const discountedPrice = product.discount 
        ? product.price - (product.price * product.discount / 100)
        : product.price;

      if (existingItem) {
        // Update quantity of existing item
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, qty: (item.qty || 0) + quantity }
            : item
        );
      } else {
        // Add new item to cart
        return [
          ...prevCart,
          {
            ...product,
            qty: quantity,
            finalPrice: discountedPrice
          }
        ];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, qty: quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getItemCount = () => {
    return cart.reduce((count, item) => count + (item.qty || 0), 0);
  };

  const isInCart = (productId) => {
    return cart.some((item) => item.id === productId);
  };

  const getItemQuantity = (productId) => {
    const item = cart.find((item) => item.id === productId);
    return item ? item.qty : 0;
  };

  const value = {
    cart,
    total,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemCount,
    isInCart,
    getItemQuantity
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
