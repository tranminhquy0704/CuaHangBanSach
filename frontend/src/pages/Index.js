import React, { Fragment, useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom"; //Hook của React Router để điều hướng trang.
import Header from "./Header";
import Banner from "./Banner";
import Feature from "./Feature";
import ProductItem from "./productItem";
import Footer from "./Footer";
import FlashSale from "./FlashSale";
import HomeTabbedShelf from "./HomeTabbedShelf";
import HomeWeeklyRanking from "./HomeWeeklyRanking";
import { toast } from 'react-toastify';
import { CartContext } from './CartContext';

function Index() {
    const [cart, setCart] = useState([]); // local cache nếu cần hiển thị riêng
    const [products, setProducts] = useState([]);
    const navigate = useNavigate();
    const { addToCart: contextAddToCart } = useContext(CartContext);

    useEffect(() => {
        // Lấy giỏ hàng từ localStorage và chuyển đổi từ JSON sang mảng
        const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
        setCart(storedCart);
        // Cart badge sử dụng từ Context trong Header nên không cần setCartCount ở đây

        // Gọi API để lấy danh sách sản phẩm
        fetch('/api/products')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Products fetched:', data);
                setProducts(data);
            })
            .catch(error => {
                console.error('Error fetching products:', error);
            });
    }, []);
    // Hàm thêm sp vào giỏ hàng
    const addToCart = (product) => {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
            toast.info('Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng');
            navigate('/login');
            return;
        }
        // Sử dụng CartContext để cập nhật giỏ hàng → Header cập nhật ngay
        contextAddToCart({ ...product, quantity: 1 });
        toast.success('Đã thêm vào giỏ hàng');
    };

    return (
        <Fragment>
            <Header />
            <Banner />
            <Feature />
            {/* Flash Sale section */}
            <FlashSale />
            <div className="container-fluid pt-5">
                <div className="text-center mb-4">
                    <h2 className="section-title px-5">
                        <span className="px-2">Sản Phẩm Mới</span>
                    </h2>
                </div>
                <div className="row">
                    {products.length > 0 ? (
                        products.map((product) => ( //Lặp qua danh sách sản phẩm và hiển thị từng sản phẩm bằng ProductItem
                            <ProductItem
                                key={product.id}
                                product={product}
                                addToCart={addToCart}
                            />
                        ))
                    ) : (
                        <p>
                            Không có sản phẩm nào</p>
                    )}
                </div>
            </div>
            {/* Tabbed shelf section (moved below sản phẩm mới) */}
            <HomeTabbedShelf products={products} onAddToCart={(p) => addToCart(p)} />
            {/* Weekly ranking section (moved below) */}
            <HomeWeeklyRanking products={products} />
            <Footer />
        </Fragment>
    );
}

export default Index;