
import React, { useState, useEffect } from "react";
import axios from "axios";

function Footer() {
    const [settings, setSettings] = useState({});
    
    useEffect(() => {
        // Fetch settings from API
        axios.get('/api/settings')
            .then(response => {
                const settingsMap = {};
                if (response.data && typeof response.data === 'object') {
                    Object.keys(response.data).forEach(key => {
                        settingsMap[key] = response.data[key].value || '';
                    });
                }
                setSettings(settingsMap);
            })
            .catch(error => {
                console.error('Error fetching settings:', error);
                // Use default values if API fails
            });
    }, []);

    const getSetting = (key, defaultValue = '') => {
        return settings[key] || defaultValue;
    };

    return (
        <footer className="footer-modern">
            <div className="container">
                <div className="footer-grid">
                    {/* Brand + info */}
                    <div className="footer-brand">
                        <div className="brand-row">
                            <img src="/assets/img/logo.jpg" alt={getSetting('store.name', 'BookStore')} className="brand-logo" />
                            <div>
                                <div className="brand-name">{getSetting('store.name', 'BookStore')}</div>
                                <div className="brand-tagline">{getSetting('store.slogan', 'Người bạn tri thức của mọi nhà')}</div>
                            </div>
                        </div>
                        <p className="mt-3">{getSetting('store.description', 'Một cuốn sách hay trên giá sách vẫn luôn là một người bạn cho dù quay lưng lại nhưng vẫn là bạn tốt.')}</p>
                    </div>

                    {/* Links */}
                    <div className="footer-links">
                        <h6>Dịch vụ</h6>
                        <ul>
                            <li><a href="/policies">Chính sách</a></li>
                            <li><a href="/contact">Liên hệ</a></li>
                            <li><a href="#">Điều khoản sử dụng</a></li>
                            <li><a href="#">Chính sách bảo mật thông tin</a></li>
                            <li><a href="#">Giới thiệu BookStore</a></li>
                        </ul>
                    </div>

                    <div className="footer-links">
                        <h6>Thông tin</h6>
                        <ul>
                            <li><a href="https://baomoi.com/" target="_blank" rel="noreferrer">Tin tức mới</a></li>
                            <li><a href="https://cleverads.vn/blog/thi-truong-sach/" target="_blank" rel="noreferrer">Thị trường</a></li>
                            <li><a href="https://baophutho.vn/xu-huong-doc-sach-hien-nay-157147.htm" target="_blank" rel="noreferrer">Xu hướng</a></li>
                        </ul>
                    </div>

                    {/* Contact moved to right side */}
                    <div className="footer-contact">
                        <h6>Liên hệ</h6>
                        <ul>
                            {getSetting('store.address') && (
                                <li><i className="fa fa-map-marker-alt"></i> {getSetting('store.address')}</li>
                            )}
                            {getSetting('store.email') && (
                                <li><i className="fa fa-envelope"></i> {getSetting('store.email')}</li>
                            )}
                            {getSetting('store.hotline') && (
                                <li><i className="fa fa-phone-alt"></i> {getSetting('store.hotline')}</li>
                            )}
                            {!getSetting('store.address') && !getSetting('store.email') && !getSetting('store.hotline') && (
                                <>
                                    <li><i className="fa fa-map-marker-alt"></i> 123, TP. Hồ Chí Minh, Việt Nam</li>
                                    <li><i className="fa fa-envelope"></i> BookStore@gmail.com</li>
                                    <li><i className="fa fa-phone-alt"></i> +012 345 67890</li>
                                </>
                            )}
                        </ul>
                        {getSetting('store.working_hours') && (
                            <div className="mt-2">
                                <small className="text-muted"><i className="fa fa-clock"></i> {getSetting('store.working_hours')}</small>
                            </div>
                        )}
                        {/* Social Media Links */}
                        {(getSetting('social.facebook') || getSetting('social.instagram') || getSetting('social.youtube') || getSetting('social.tiktok') || getSetting('social.zalo')) && (
                            <div className="mt-3">
                                <h6 className="mb-2">Theo dõi chúng tôi</h6>
                                <div className="d-flex flex-wrap gap-2">
                                    {getSetting('social.facebook') && (
                                        <a href={getSetting('social.facebook')} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary" title="Facebook">
                                            <i className="fab fa-facebook-f"></i>
                                        </a>
                                    )}
                                    {getSetting('social.instagram') && (
                                        <a href={getSetting('social.instagram')} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger" title="Instagram" style={{background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', border: 'none', color: 'white'}}>
                                            <i className="fab fa-instagram"></i>
                                        </a>
                                    )}
                                    {getSetting('social.youtube') && (
                                        <a href={getSetting('social.youtube')} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger" title="YouTube" style={{backgroundColor: '#FF0000', border: 'none', color: 'white'}}>
                                            <i className="fab fa-youtube"></i>
                                        </a>
                                    )}
                                    {getSetting('social.tiktok') && (
                                        <a href={getSetting('social.tiktok')} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-dark" title="TikTok" style={{backgroundColor: '#000000', border: 'none', color: 'white'}}>
                                            <i className="fab fa-tiktok"></i>
                                        </a>
                                    )}
                                    {getSetting('social.zalo') && (
                                        <a href={getSetting('social.zalo').startsWith('http') ? getSetting('social.zalo') : `https://zalo.me/${getSetting('social.zalo').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" title="Zalo" style={{backgroundColor: '#0068FF', border: 'none', color: 'white'}}>
                                            <i className="fab fa-facebook-messenger"></i> Zalo
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Newsletter đã được gỡ bỏ theo yêu cầu */}
                </div>
            </div>
        </footer>
    )
}

export default Footer;