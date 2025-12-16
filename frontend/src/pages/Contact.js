import React, { Fragment, useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import axios from "axios";
import { toast } from 'react-toastify';

function Contact() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        setLoading(true);
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
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const getSetting = (key, defaultValue = '') => {
        return settings[key] || defaultValue;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await axios.post('/api/contact', formData);
            
            if (response.data.success) {
                toast.success(response.data.message);
                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: ''
                });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau';
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
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

            {loading ? (
                <div className="container-fluid pt-5 pb-5">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Đang tải...</span>
                        </div>
                        <p className="mt-3 text-muted">Đang tải thông tin...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="container-fluid pt-5">
                <div className="text-center mb-4">
                    <h2 className="section-title px-5"><span className="px-2">Liên Hệ</span></h2>
                </div>
                <div className="row px-xl-5">
                    <div className="col-lg-7 mb-5">
                        <div className="contact-form">
                            <form onSubmit={handleSubmit}>
                                <div className="control-group mb-3">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        name="name"
                                        placeholder="Họ và tên"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="control-group mb-3">
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        name="email"
                                        placeholder="Email của bạn"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="control-group mb-3">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        name="subject"
                                        placeholder="Tiêu đề"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="control-group mb-3">
                                    <textarea 
                                        className="form-control" 
                                        rows="6" 
                                        name="message"
                                        placeholder="Nội dung tin nhắn"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                    ></textarea>
                                </div>
                                <div>
                                    <button 
                                        className="btn btn-primary py-2 px-4" 
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
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

            {/* Google Maps */}
            <div className="container-fluid pt-5 mb-5">
                <div className="row px-xl-5">
                    <div className="col-12">
                        <div className="text-center mb-4">
                            <h2 className="section-title px-5"><span className="px-2">Vị trí cửa hàng</span></h2>
                        </div>
                        <div className="mx-xl-5">
                            <div className="bg-light p-3 rounded" style={{ height: '400px' }}>
                                <iframe
                                    title="Store Location"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.3249313620494!2d106.66408931533419!3d10.786834992314447!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752ed2392c44df%3A0xd2ecb62e0d050fe9!2sFPT-Aptech%20Computer%20Education%20HCM!5e0!3m2!1svi!2s!4v1638345678901!5m2!1svi!2s"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            </div>
                            <p className="text-muted mt-3 text-center">
                                <i className="fa fa-info-circle me-2"></i>
                                Bạn có thể thay đổi vị trí bản đồ trong phần cài đặt quản trị
                            </p>
                        </div>
                    </div>
                </div>
            </div>
                </>
            )}

            <Footer />
        </Fragment>
    )
}

export default Contact;