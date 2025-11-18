import React, { Fragment, useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import axios from "axios";

function Contact() {
    const [settings, setSettings] = useState({});
    
    useEffect(() => {
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
            });
    }, []);

    const getSetting = (key, defaultValue = '') => {
        return settings[key] || defaultValue;
    };

    return (
        <Fragment>
            <Header />

            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Liên hệ với chúng tôi</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Liên hệ</p>
                    </div>
                </div>
            </div>

            <div className="container-fluid pt-5">
                <div className="text-center mb-4">
                    <h2 className="section-title px-5"><span className="px-2">Liên Hệ</span></h2>
                </div>
                <div className="row px-xl-5">
                    <div className="col-lg-7 mb-5">
                        <div className="contact-form">
                            <div id="success"></div>
                            <form name="sentMessage" id="contactForm" noValidate>
                                <div className="control-group">
                                    <input type="text" className="form-control" id="name" placeholder="Your Name"
                                        required="required" data-validation-required-message="Please enter your name" />
                                    <p className="help-block text-danger"></p>
                                </div>
                                <div className="control-group">
                                    <input type="email" className="form-control" id="email" placeholder="Your Email"
                                        required="required" data-validation-required-message="Please enter your email" />
                                    <p className="help-block text-danger"></p>
                                </div>
                                <div className="control-group">
                                    <input type="text" className="form-control" id="subject" placeholder="Subject"
                                        required="required" data-validation-required-message="Please enter a subject" />
                                    <p className="help-block text-danger"></p>
                                </div>
                                <div className="control-group">
                                    <textarea className="form-control" rows="6" id="message" placeholder="Message"
                                        required="required"
                                        data-validation-required-message="Please enter your message"></textarea>
                                    <p className="help-block text-danger"></p>
                                </div>
                                <div>
                                    <button className="btn btn-primary py-2 px-4" type="submit" id="sendMessageButton">Gửi
                                        </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="col-lg-5 mb-5">
                        <h5 className="font-weight-semi-bold mb-3">{getSetting('store.name', 'Book Store')}</h5>
                        <p>{getSetting('store.description', 'Một cuốn sách hay trên giá sách vẫn luôn là một người bạn cho dù quay lưng lại nhưng vẫn là bạn tốt.')}</p>
                        <div className="d-flex flex-column mb-3">
                            <h5 className="font-weight-semi-bold mb-3">Thông tin liên hệ</h5>
                            {getSetting('store.address') && (
                                <p className="mb-2"><i className="fa fa-map-marker-alt text-primary mr-3"></i>{getSetting('store.address')}</p>
                            )}
                            {getSetting('store.email') && (
                                <p className="mb-2"><i className="fa fa-envelope text-primary mr-3"></i>{getSetting('store.email')}</p>
                            )}
                            {getSetting('store.hotline') && (
                                <p className="mb-2"><i className="fa fa-phone-alt text-primary mr-3"></i>{getSetting('store.hotline')}</p>
                            )}
                            {getSetting('store.working_hours') && (
                                <p className="mb-2"><i className="fa fa-clock text-primary mr-3"></i>{getSetting('store.working_hours')}</p>
                            )}
                            {!getSetting('store.address') && !getSetting('store.email') && !getSetting('store.hotline') && (
                                <>
                                    <p className="mb-2"><i className="fa fa-map-marker-alt text-primary mr-3"></i>123, TP. Hồ Chí Minh, Việt Nam</p>
                                    <p className="mb-2"><i className="fa fa-envelope text-primary mr-3"></i>BookStore@gmail.com</p>
                                    <p className="mb-2"><i className="fa fa-phone-alt text-primary mr-3"></i>+012 345 67890</p>
                                </>
                            )}
                        </div>
                        {/* Social Media Links */}
                        {(getSetting('social.facebook') || getSetting('social.instagram') || getSetting('social.youtube') || getSetting('social.tiktok') || getSetting('social.zalo')) && (
                            <div className="mt-4">
                                <h5 className="font-weight-semi-bold mb-3">Mạng xã hội</h5>
                                <div className="d-flex flex-wrap gap-2">
                                    {getSetting('social.facebook') && (
                                        <a href={getSetting('social.facebook')} target="_blank" rel="noopener noreferrer" className="btn btn-primary" title="Facebook">
                                            <i className="fab fa-facebook-f me-2"></i>Facebook
                                        </a>
                                    )}
                                    {getSetting('social.instagram') && (
                                        <a href={getSetting('social.instagram')} target="_blank" rel="noopener noreferrer" className="btn" title="Instagram" style={{background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', border: 'none', color: 'white'}}>
                                            <i className="fab fa-instagram me-2"></i>Instagram
                                        </a>
                                    )}
                                    {getSetting('social.youtube') && (
                                        <a href={getSetting('social.youtube')} target="_blank" rel="noopener noreferrer" className="btn" title="YouTube" style={{backgroundColor: '#FF0000', border: 'none', color: 'white'}}>
                                            <i className="fab fa-youtube me-2"></i>YouTube
                                        </a>
                                    )}
                                    {getSetting('social.tiktok') && (
                                        <a href={getSetting('social.tiktok')} target="_blank" rel="noopener noreferrer" className="btn btn-dark" title="TikTok">
                                            <i className="fab fa-tiktok me-2"></i>TikTok
                                        </a>
                                    )}
                                    {getSetting('social.zalo') && (
                                        <a href={getSetting('social.zalo').startsWith('http') ? getSetting('social.zalo') : `https://zalo.me/${getSetting('social.zalo').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn" title="Zalo" style={{backgroundColor: '#0068FF', border: 'none', color: 'white'}}>
                                            <i className="fab fa-facebook-messenger me-2"></i>Zalo
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </Fragment>
    )
}

export default Contact;