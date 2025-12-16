import React, { Fragment, useEffect, useState, useContext, useMemo } from "react";
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
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { addToCart: contextAddToCart } = useContext(CartContext);

    // Lọc sản phẩm mới: những sản phẩm mới thêm, chưa có dữ liệu mua và đánh giá
    const newProducts = useMemo(() => {
        return products
            .filter(p => (Number(p.sold) || 0) === 0 && (Number(p.rating_count) || 0) === 0)
            .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
            .slice(0, 5);
    }, [products]);

    // Lọc sản phẩm giảm giá: những sản phẩm có discount > 0
    const discountedProducts = useMemo(() => {
        return products
            .filter(p => Number(p.discount) > 0)
            .sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0))
            .slice(0, 5);
    }, [products]);

    useEffect(() => {
        // Lấy giỏ hàng từ localStorage và chuyển đổi từ JSON sang mảng
        const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
        setCart(storedCart);
        // Cart badge sử dụng từ Context trong Header nên không cần setCartCount ở đây

        // Gọi API để lấy danh sách sản phẩm
        setLoading(true);
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
            })
            .finally(() => {
                setLoading(false);
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
            {loading ? (
                <div className="container-fluid pt-5 pb-5">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
                            <span className="sr-only">Đang tải...</span>
                        </div>
                        <p className="mt-3 text-muted">Đang tải sản phẩm...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Flash Sale section */}
                    <FlashSale />
                    {/* Sản Phẩm Mới - chỉ hiển thị vài sản phẩm mới thêm, chưa có dữ liệu mua và đánh giá */}
                    <div className="container-fluid pt-5">
                <div className="text-center mb-4">
                    <h2 className="section-title px-5">
                        <span className="px-2">Sản Phẩm Mới</span>
                    </h2>
                </div>
                <div className="row px-xl-5 justify-content-center">
                    {newProducts.length > 0 ? (
                        newProducts.map((product) => (
                            <ProductItem
                                key={product.id}
                                product={product}
                                addToCart={addToCart}
                            />
                        ))
                    ) : (
                        <div className="col-12 text-center">
                            <p className="text-muted">Không có sản phẩm mới nào</p>
                        </div>
                    )}
                    {newProducts.length > 0 && (
                        <div className="col-12 d-flex justify-content-center mt-2">
                            <a href="/shop" className="btn btn-outline-primary px-4">Xem Thêm</a>
                        </div>
                    )}
                </div>
            </div>
            {/* Sản Phẩm Giảm Giá */}
            <div className="container-fluid pt-5">
                <div className="text-center mb-4">
                    <h2 className="section-title px-5">
                        <span className="px-2">Sản Phẩm Giảm Giá</span>
                    </h2>
                </div>
                <div className="row px-xl-5 justify-content-center">
                    {discountedProducts.length > 0 ? (
                        discountedProducts.map((product) => (
                            <ProductItem
                                key={product.id}
                                product={product}
                                addToCart={addToCart}
                            />
                        ))
                    ) : (
                        <div className="col-12 text-center">
                            <p className="text-muted">Không có sản phẩm giảm giá nào</p>
                        </div>
                    )}
                    {discountedProducts.length > 0 && (
                        <div className="col-12 d-flex justify-content-center mt-2">
                            <a href="/shop" className="btn btn-outline-primary px-4">Xem Thêm</a>
                        </div>
                    )}
                </div>
            </div>
            {/* Tabbed shelf section (moved below sản phẩm mới) */}
            <HomeTabbedShelf products={products} onAddToCart={(p) => addToCart(p)} />
            {/* Weekly ranking section (moved below) */}
            <HomeWeeklyRanking products={products} />
                </>
            )}
            <Footer />
        </Fragment>
    );
}

export default Index;