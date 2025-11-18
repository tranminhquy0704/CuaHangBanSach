import React, { useState, useEffect } from 'react';
import { parseVND, formatVND } from '../utils/currency';
import axios from 'axios';

function ProductItem({ product, addToCart }) {
    const [displaySettings, setDisplaySettings] = useState({
        show_rating: true,
        show_sold: true
    });

    useEffect(() => {
        axios.get('/api/settings')
            .then(response => {
                if (response.data && typeof response.data === 'object') {
                    const settings = {};
                    Object.keys(response.data).forEach(key => {
                        settings[key] = response.data[key].value || '';
                    });
                    setDisplaySettings({
                        show_rating: settings['display.show_rating'] === 'true',
                        show_sold: settings['display.show_sold'] === 'true'
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching display settings:', error);
            });
    }, []);
    const handleAddToCart = (e) => {
        e.preventDefault();
        addToCart(product); // Gọi hàm addToCart khi nhấn nút
     
    };

    // Price formatting (VN)
    const priceNumber = parseVND(product.price);
    const priceFormatted = formatVND(priceNumber);

    // Helpers for stars and sold
    const renderStars = (rating = 0) => {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        const stars = [];
        for (let i = 0; i < full; i++) stars.push(<i key={`f${i}`} className="fas fa-star"></i>);
        if (half) stars.push(<i key="h" className="fas fa-star-half-alt"></i>);
        for (let i = 0; i < empty; i++) stars.push(<i key={`e${i}`} className="far fa-star"></i>);
        return stars;
    };

    const formatSold = (n = 0) => {
        if (n >= 1000) return (Math.round((n / 1000) * 10) / 10) + 'k';
        return String(n);
    };

    return (
        <div className="col-lg-2 col-md-3 col-sm-6 pb-1">
            <div className="card product-item border-0 mb-4">
                <a href={`/shopdetail/${product.id}`} className="card-header product-img position-relative overflow-hidden bg-transparent border p-0 d-block">
                    {/* Optional badge */}
                    {Number(product?.discount) > 0 && (
                        <span className="product-badge badge-sale">-{product.discount}%</span>
                    )}
                    {!!product?.isNew && !(Number(product?.discount) > 0) && (
                        <span className="product-badge badge-new">Mới</span>
                    )}
                    <img className="img-fluid w-100" src={product.img} alt={product.name} />
                </a>
                <div className="card-body border-left border-right text-center p-0 pt-4 pb-3">
                    <h6 className="product-title mb-2"><a href={`/shopdetail/${product.id}`} className="text-dark">{product.name}</a></h6>
                    <div className="d-flex justify-content-center">
                        <h6>{priceFormatted}</h6>
                    </div>
                    {(displaySettings.show_rating || displaySettings.show_sold) && (
                        <div className="d-flex justify-content-center align-items-center gap-2 mt-1" style={{columnGap:'8px'}}>
                            {displaySettings.show_rating && Number(product.rating_count) > 0 && (
                                <div className="rating-stars text-warning" aria-label={`Đánh giá ${Number(product.rating)} trên 5`}>
                                    {renderStars(Number(product.rating) || 0)}
                                </div>
                            )}
                            {displaySettings.show_sold && (
                                <small className="text-muted">Đã bán {formatSold(Number(product.sold) || 0)}</small>
                            )}
                        </div>
                    )}
                </div>
                <div className="card-footer d-flex justify-content-between bg-light border">
                    <a href="/" className="btn btn-sm text-dark p-0"
                        onClick={handleAddToCart}>
                        <i className="fas fa-shopping-cart text-primary mr-1"></i>
                        Thêm vào giỏ hàng
                    </a>
                    <a href={`/shopdetail/${product.id}`} className="btn btn-sm text-dark p-0">
                        <i className="fas fa-eye text-primary mr-1"></i> Chi tiết
                    </a>
                </div>
            </div>
        </div>
    );
}

export default ProductItem;