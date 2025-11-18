import React, { createContext, useState, useEffect } from 'react';

// Tạo context để chia sẻ giỏ hàng
export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    // Đọc giỏ hàng từ localStorage khi ứng dụng khởi động
    useEffect(() => {
        const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
        setCart(storedCart);
    }, []);

    // Hàm để cập nhật giỏ hàng
    const updateCart = (newCart) => {
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    // Thêm sản phẩm vào giỏ hàng hoặc cập nhật số lượng nếu sản phẩm đã có
    const addToCart = (product) => {
        const existingProduct = cart.find(item => item.id === product.id);

        if (existingProduct) {
            const updatedCart = cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + product.quantity } : item
            );
            updateCart(updatedCart);
        } else {
            const updatedCart = [...cart, { ...product, quantity: product.quantity }];
            updateCart(updatedCart);
        }
    };

    // Hàm để giảm số lượng sản phẩm trong giỏ hàng
    const decreaseQuantity = (productId) => {
        const updatedCart = cart.map(item =>
            item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        ).filter(item => item.quantity > 0); // Xóa sản phẩm nếu số lượng = 0
        updateCart(updatedCart);
    };

    // Hàm để xóa sản phẩm khỏi giỏ hàng
    const removeFromCart = (productId) => {
        const updatedCart = cart.filter(item => item.id !== productId);
        updateCart(updatedCart);
    };

    const clearCart = () => {
        updateCart([]);
    };

    // Tính tổng số lượng sản phẩm trong giỏ hàng
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    // Cung cấp các hàm và trạng thái cho các component con
    return (
        <CartContext.Provider value={{ cart, addToCart, decreaseQuantity, removeFromCart, clearCart, cartCount }}>
            {children}
        </CartContext.Provider>
    );
};
