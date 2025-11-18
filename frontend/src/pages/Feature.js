import React from 'react';

const Feature = () => {
    return (
        <div className="container feature-section">
            <div className="feature-grid">
                <div className="feature-card">
                    <span className="feature-icon success"><i className="fa fa-check"></i></span>
                    <div className="feature-text">
                        <h5>Sản phẩm chất lượng</h5>
                        <p>Chính hãng, kiểm định kỹ lưỡng</p>
                    </div>
                </div>
                <div className="feature-card">
                    <span className="feature-icon primary"><i className="fa fa-shipping-fast"></i></span>
                    <div className="feature-text">
                        <h5>Miễn phí vận chuyển</h5>
                        <p>Áp dụng cho đơn từ 299.000đ</p>
                    </div>
                </div>
                <div className="feature-card">
                    <span className="feature-icon secondary"><i className="fas fa-exchange-alt"></i></span>
                    <div className="feature-text">
                        <h5>14 ngày đổi trả</h5>
                        <p>Đổi ý hoàn toàn dễ dàng</p>
                    </div>
                </div>
                <div className="feature-card">
                    <span className="feature-icon warning"><i className="fa fa-phone-volume"></i></span>
                    <div className="feature-text">
                        <h5>Hỗ trợ 24/7</h5>
                        <p>Tư vấn nhanh chóng, thân thiện</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Feature;