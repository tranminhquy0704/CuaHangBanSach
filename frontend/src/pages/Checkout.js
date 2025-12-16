import React, { Fragment, useEffect, useState, useContext } from "react";
import { useNavigate, Link } from 'react-router-dom';
import Header from "./Header";
import Footer from "./Footer";
import axios from 'axios';
import { parseVND, formatVND } from '../utils/currency';
import { toast } from 'react-toastify';
import { CartContext } from './CartContext';

function Checkout() {
    const { clearCart } = useContext(CartContext);
    // Khai báo các biến trạng thái
    const [cartItems, setCartItems] = useState([]); // Danh sách sản phẩm trong giỏ hàng
    const [formData, setFormData] = useState({
        fullName: '', // Họ và tên
        mobile: '', // Số điện thoại
        address: '', // Địa chỉ
        state: '', // Tỉnh/Thành phố
        paymentMethod: '', // Phương thức thanh toán
        note: '' // Ghi chú (tùy chọn)
    });
    const [errors, setErrors] = useState({});
    const [shippingSettings, setShippingSettings] = useState({
        fee: 30000,
        free_threshold: 500000,
        delivery_days: 3,
        areas: 'Toàn quốc'
    });
    const [promoSettings, setPromoSettings] = useState({
        bulk_discount: 0,
        bulk_threshold: 5,
        enable_voucher: false
    });
    const [paymentSettings, setPaymentSettings] = useState({
        enable_cod: true,
        enable_bank: false,
        enable_ewallet: false,
        bank_info: ''
    });
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [voucherError, setVoucherError] = useState('');
    const [myVouchers, setMyVouchers] = useState([]);
    const [selectedUserVoucherId, setSelectedUserVoucherId] = useState(null);
    const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);
    const [hasAuthToken, setHasAuthToken] = useState(!!localStorage.getItem('token'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const popularProvinces = [
        'Hồ Chí Minh','Hà Nội','Đà Nẵng','Cần Thơ','Bình Dương','Đồng Nai','Hải Phòng'
    ];
    const otherProvinces = [
        'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Phước','Bình Thuận','Cà Mau','Cao Bằng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Tĩnh','Hải Dương','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
    ];

    // Sử dụng useEffect để lấy giỏ hàng từ localStorage 
    useEffect(() => {
        const storedCart = localStorage.getItem("cart");
        if (storedCart) {
            setCartItems(JSON.parse(storedCart));
        }
        // Khôi phục phương thức thanh toán
        const savedMethod = localStorage.getItem('paymentMethod');
        if (savedMethod) {
            setFormData((prev) => ({...prev, paymentMethod: savedMethod}));
        } else {
            // default chọn COD nếu được bật, nếu không thì chọn phương thức đầu tiên có sẵn
            // Sẽ được set sau khi load settings
        }

        // Khôi phục dữ liệu form
        const savedForm = localStorage.getItem('checkoutForm');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                // Ignore any legacy `email` stored previously
                if (parsed && parsed.email) delete parsed.email;
                setFormData((prev) => ({...prev, ...parsed}));
            } catch {}
        }

        // Fetch settings
        axios.get('/api/settings')
            .then(response => {
                if (response.data && typeof response.data === 'object') {
                    const settings = {};
                    Object.keys(response.data).forEach(key => {
                        settings[key] = response.data[key].value || '';
                    });
                    setShippingSettings({
                        fee: parseInt(settings['shipping.fee']) || 30000,
                        free_threshold: parseInt(settings['shipping.free_threshold']) || 500000,
                        delivery_days: parseInt(settings['shipping.delivery_days']) || 3,
                        areas: settings['shipping.areas'] || 'Toàn quốc'
                    });
                    setPromoSettings({
                        bulk_discount: parseInt(settings['promo.bulk_discount']) || 0,
                        bulk_threshold: parseInt(settings['promo.bulk_threshold']) || 5,
                        enable_voucher: settings['promo.enable_voucher'] === 'true'
                    });
                    const paymentSettings = {
                        enable_cod: settings['payment.enable_cod'] === 'true',
                        enable_bank: settings['payment.enable_bank'] === 'true',
                        enable_ewallet: settings['payment.enable_ewallet'] === 'true',
                        bank_info: settings['payment.bank_info'] || ''
                    };
                    setPaymentSettings(paymentSettings);
                    
                    // Set default payment method if not set
                    if (!formData.paymentMethod) {
                        if (paymentSettings.enable_cod) {
                            setFormData((prev) => ({...prev, paymentMethod: 'cod'}));
                        } else if (paymentSettings.enable_bank) {
                            setFormData((prev) => ({...prev, paymentMethod: 'banktransfer'}));
                        } else if (paymentSettings.enable_ewallet) {
                            setFormData((prev) => ({...prev, paymentMethod: 'ewallet'}));
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching settings:', error);
            });

        const token = localStorage.getItem('token');
        setHasAuthToken(!!token);
        
        // Function to load vouchers - ALWAYS load fresh data
        const loadVouchers = () => {
            if (token) {
                setLoadingMyVouchers(true);
                axios.get('/api/my-vouchers', { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(response => {
                        console.log('[Checkout] Vouchers loaded:', response.data);
                        setMyVouchers(Array.isArray(response.data) ? response.data : []);
                    })
                    .catch(error => {
                        console.error('Error fetching my vouchers:', error);
                    })
                    .finally(() => setLoadingMyVouchers(false));
            }
        };
        
        // Load vouchers immediately on mount
        loadVouchers();
        
        // Also reload when page becomes visible
        const handleVisibilityChange = () => {
            if (!document.hidden && token) {
                console.log('[Checkout] Page visible, reloading vouchers...');
                loadVouchers();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Hàm tính tổng phụ (subtotal) của giỏ hàng - chuẩn hoá giá VND
    const getSubtotal = () => {
        return cartItems.reduce((total, item) => {
            const unit = parseVND(item.price);
            return total + unit * (item.quantity || 1);
        }, 0);
    };

    // Tính tổng số lượng sản phẩm
    const getTotalQuantity = () => {
        return cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
    };

    // Tính giảm giá khi mua nhiều
    const getBulkDiscount = () => {
        const totalQty = getTotalQuantity();
        if (totalQty >= promoSettings.bulk_threshold && promoSettings.bulk_discount > 0) {
            const subtotal = getSubtotal();
            return Math.round(subtotal * promoSettings.bulk_discount / 100);
        }
        return 0;
    };

    // Xử lý áp dụng voucher
    const handleApplyVoucher = async (codeOverride = null, options = {}) => {
        const candidate = codeOverride ?? voucherCode ?? '';
        const effectiveCode = String(candidate).trim().toUpperCase();
        if (!effectiveCode) {
            setVoucherError('Vui lòng nhập mã voucher');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await axios.post('/api/vouchers/validate', { code: effectiveCode }, { headers });
            const voucher = response.data;
            
            // Sử dụng subtotal GỐC (chưa trừ bulk discount) để kiểm tra điều kiện tối thiểu
            const originalSubtotal = getSubtotal();
            
            // Check minimum order amount
            if (originalSubtotal < voucher.min_order_amount) {
                setVoucherError(`Đơn hàng tối thiểu ${formatVND(voucher.min_order_amount)} để sử dụng voucher này`);
                setVoucherDiscount(0);
                setSelectedUserVoucherId(null);
                if (!options.silent) toast.info('Giá trị đơn hàng chưa đạt điều kiện voucher');
                return;
            }
            
            // Calculate discount - Áp dụng trên subtotal SAU khi trừ bulk discount
            const subtotalAfterBulk = originalSubtotal - getBulkDiscount();
            let discount = 0;
            if (voucher.discount_type === 'percent') {
                discount = Math.round(subtotalAfterBulk * voucher.discount_value / 100);
                if (voucher.max_discount && discount > voucher.max_discount) {
                    discount = voucher.max_discount;
                }
            } else {
                discount = voucher.discount_value;
            }
            
            setVoucherDiscount(discount);
            setVoucherError('');
            setVoucherCode(effectiveCode);
            
            // Sử dụng user_voucher_id từ API response hoặc từ options
            const finalUserVoucherId = options.userVoucherId || voucher.user_voucher_id || null;
            setSelectedUserVoucherId(finalUserVoucherId);
            
            if (!options.silent) toast.success(`Áp dụng voucher thành công! Giảm ${formatVND(discount)}`);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Mã voucher không hợp lệ';
            setVoucherError(errorMsg);
            setVoucherDiscount(0);
            setSelectedUserVoucherId(null);
            if (!options.silent) toast.error(errorMsg);
        }
    };

    const handleSelectSavedVoucher = (voucher) => {
        if (!voucher) {
            toast.error('Voucher không hợp lệ');
            return;
        }
        handleApplyVoucher(voucher.code, { userVoucherId: voucher.user_voucher_id });
    };

    // Tính tổng giảm giá (bulk + voucher)
    const getTotalDiscount = () => {
        return getBulkDiscount() + voucherDiscount;
    };

    // API /api/my-vouchers đã lọc voucher chưa dùng và còn hạn
    const availableSavedVouchers = myVouchers;

    // Hàm tính phí vận chuyển (tính sau khi trừ giảm giá)
    const getShippingFee = () => {
        const subtotalAfterDiscount = getSubtotal() - getTotalDiscount();
        if (subtotalAfterDiscount >= shippingSettings.free_threshold) {
            return 0; // Miễn phí ship
        }
        return shippingSettings.fee || 0;
    };

    // Hàm tính tổng cộng (total) của giỏ hàng
    const getTotal = () => {
        return getSubtotal() - getTotalDiscount() + getShippingFee();
    };

    // Hàm xử lý thay đổi dữ liệu trong form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const next = { ...formData, [name]: value };
        setFormData(next);
        // Lưu localStorage
        if (name === 'paymentMethod') localStorage.setItem('paymentMethod', value);
        localStorage.setItem('checkoutForm', JSON.stringify({
            fullName: next.fullName,
            mobile: next.mobile,
            address: next.address,
            state: next.state,
            note: next.note
        }));
        // Validate nhanh từng trường
        validateField(name, value);
    };

    const validateField = (name, value) => {
        let msg = '';
        if (['fullName','mobile','address','state'].includes(name) && !value.trim()) msg = 'Vui lòng nhập thông tin.';
        if (name === 'mobile') {
            const phoneOk = /^(0[3|5|7|8|9])[0-9]{8}$/.test(value.replace(/\s+/g,''));
            if (!phoneOk) msg = 'Số điện thoại VN không hợp lệ.';
        }
        setErrors(prev => ({...prev, [name]: msg}));
    };

    const validateForm = () => {
        const fields = ['fullName','mobile','address','state'];
        const newErrors = {};
        fields.forEach(f => validateField(f, formData[f]));
        fields.forEach(f => {
            if (!formData[f] || (errors[f] && errors[f].length)) newErrors[f] = errors[f] || 'Vui lòng nhập thông tin.';
        });
        setErrors(prev => ({...prev, ...newErrors}));
        const hasError = fields.some(f => newErrors[f]);
        return !hasError;
    };

    // Hàm xử lý đặt hàng
    const handlePlaceOrder = async () => {
        // Prevent double submission
        if (isSubmitting) {
            console.log('[Checkout] Already submitting, ignoring...');
            return;
        }
        
        // Kiểm tra nếu giỏ hàng trống
        if (cartItems.length === 0) {
            toast.info('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
            return;
        }

        // Validate form giao hàng
        if (!validateForm()) {
            toast.info('Vui lòng kiểm tra lại thông tin giao hàng.');
            return;
        }
        
        // Backend sẽ validate voucher - không cần kiểm tra phức tạp ở frontend

        setIsSubmitting(true);
        try {
            // Lưu thông tin voucher trước khi reset
            const currentVoucherCode = voucherCode ? voucherCode.trim().toUpperCase() : null;
            const currentUserVoucherId = selectedUserVoucherId;
            
            console.log('=== Order Data Debug ===');
            console.log('Cart Items:', cartItems);
            console.log('Subtotal (before discounts):', getSubtotal());
            console.log('Bulk Discount:', getBulkDiscount());
            console.log('Voucher Code:', currentVoucherCode);
            console.log('User Voucher ID:', currentUserVoucherId);
            console.log('Voucher Discount:', voucherDiscount);
            console.log('Shipping Fee:', getShippingFee());
            console.log('Total:', getTotal());
            
            // Tạo dữ liệu đơn hàng
            const orderData = {
                // Do not send email field anymore
                fullName: formData.fullName,
                mobile: formData.mobile,
                address: formData.address,
                state: formData.state,
                paymentMethod: formData.paymentMethod,
                note: formData.note,
                cartItems,
                subtotal: getSubtotal(), // Gửi subtotal gốc để backend validate voucher
                total: getTotal(),
                voucherCode: currentVoucherCode,
                userVoucherId: currentUserVoucherId
            };

            // Reset voucher NGAY trước khi gửi để tránh double submit
            setVoucherCode('');
            setVoucherDiscount(0);
            setSelectedUserVoucherId(null);
            setVoucherError('');

            // Gửi dữ liệu đơn hàng lên server
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resp = await axios.post('/api/orders', orderData, { headers });
            const updatedSold = resp?.data?.updatedSold;
            toast.success(`Đặt hàng thành công!${typeof updatedSold === 'number' ? ` (cập nhật ${updatedSold} sản phẩm)` : ''}`);
            
            // Force reload vouchers ngay lập tức nếu có token
            if (token) {
                console.log('[Checkout] Force reloading vouchers after order...');
                axios.get('/api/my-vouchers', { headers })
                    .then(response => {
                        console.log('[Checkout] Vouchers reloaded after order:', response.data);
                        setMyVouchers(Array.isArray(response.data) ? response.data : []);
                    })
                    .catch(error => {
                        console.error('Error reloading vouchers:', error);
                    });
            }
            
            localStorage.removeItem('cart'); // Xóa giỏ hàng sau khi đặt hàng thành công
            clearCart(); // Cập nhật CartContext
            setCartItems([]); // Cập nhật state local
            // Giữ lại thông tin người nhận cho lần sau, chỉ xóa ghi chú
            const kept = {...formData, note: ''};
            localStorage.setItem('checkoutForm', JSON.stringify({
                fullName: kept.fullName,
                mobile: kept.mobile,
                address: kept.address,
                state: kept.state,
                note: kept.note
            }));
            // Điều hướng về trang Cửa hàng để refetch dữ liệu và thấy "Đã bán" cập nhật
            setTimeout(() => navigate('/shop'), 300);
        } catch (error) {
            console.error('Error placing order:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.';
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
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Thanh toán</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Thanh toán</p>
                    </div>
                </div>
            </div>

            <div className="container-fluid pt-5">
                <div className="row px-xl-5">
                    <div className="col-lg-8">
                        <div className="mb-4">
                            <h4 className="font-weight-semi-bold mb-4">Thông tin giao hàng</h4>
                            <div className="row">
                                <div className="col-md-6 form-group">
                                    <label>Họ và tên</label>
                                    <input className="form-control" type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} />
                                    {errors.fullName && <small className="text-danger">{errors.fullName}</small>}
                                </div>
                                {/* Email field removed: we no longer collect a separate shipping email */}
                                <div className="col-md-6 form-group">
                                    <label>Số điện thoại</label>
                                    <input className="form-control" type="text" name="mobile" value={formData.mobile} onChange={handleInputChange} />
                                    {errors.mobile && <small className="text-danger">{errors.mobile}</small>}
                                </div>
                                <div className="col-md-6 form-group">
                                    <label>Địa chỉ</label>
                                    <input className="form-control" type="text" name="address" value={formData.address} onChange={handleInputChange} />
                                    {errors.address && <small className="text-danger">{errors.address}</small>}
                                </div>
                                <div className="col-md-6 form-group">
                                    <label>Tỉnh/Thành <span className="text-danger">*</span></label>
                                    <select className="form-control" name="state" value={formData.state} onChange={handleInputChange}>
                                        <option value="" disabled>Chọn Tỉnh/Thành nơi nhận hàng</option>
                                        <optgroup label="Phổ biến">
                                            {popularProvinces.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Khác">
                                            {otherProvinces.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <small className="text-muted">Chọn tỉnh/thành để đảm bảo giao đúng khu vực.</small><br/>
                                    {errors.state && <small className="text-danger">{errors.state}</small>}
                                </div>
                                <div className="col-md-6 form-group">
                                    <label>Ghi chú (tùy chọn)</label>
                                    <textarea className="form-control" rows="1" name="note" value={formData.note} onChange={handleInputChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-light border-0 text-center">
                                <h4 className="font-weight-semi-bold m-0 text-uppercase">Tổng đơn hàng</h4>
                            </div>
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="text-uppercase text-muted mb-0">Sản phẩm</h6>
                                    <Link to="/cart" className="small text-decoration-none">Chỉnh sửa giỏ hàng</Link>
                                </div>
                                <div className="order-items-list border rounded p-3 mb-3" style={{maxHeight:'240px', overflowY:'auto', backgroundColor:'#fdfdfd'}}>
                                    {cartItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="py-1"
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr auto',
                                                alignItems: 'center',
                                                width: '100%'
                                            }}
                                        >
                                            <div className="text-truncate" style={{whiteSpace:'nowrap', textAlign:'left'}} title={item.name}>
                                                <span className="fw-semibold">{item.name}</span>
                                                <small className="d-block text-muted">x{item.quantity || 1}</small>
                                            </div>
                                            <span className="text-end fw-semibold" style={{justifySelf:'end'}}>{formatVND(parseVND(item.price) * (item.quantity || 1))}</span>
                                        </div>
                                    ))}
                                </div>
                                <hr className="mt-0" />
                                <div className="d-flex justify-content-between mb-2 pt-1">
                                    <h6 className="font-weight-medium">Tổng phụ</h6>
                                    <h6 className="font-weight-medium">{formatVND(getSubtotal())}</h6>
                                </div>
                                {getBulkDiscount() > 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>
                                            <h6 className="font-weight-medium mb-0 text-success">Giảm giá mua nhiều</h6>
                                            <small className="text-muted">Mua từ {promoSettings.bulk_threshold} sản phẩm: -{promoSettings.bulk_discount}%</small>
                                        </div>
                                        <h6 className="font-weight-medium text-success">-{formatVND(getBulkDiscount())}</h6>
                                    </div>
                                )}
                                {promoSettings.enable_voucher && (
                                    <div className="mb-2">
                                        <div className="input-group input-group-sm">
                                            <input 
                                                type="text" 
                                                className={`form-control ${voucherError ? 'is-invalid' : ''}`}
                                                placeholder="Nhập mã voucher (ví dụ: WELCOME20K)"
                                                value={voucherCode}
                                                onChange={(e) => {
                                                    setVoucherCode(e.target.value.toUpperCase());
                                                    setVoucherError('');
                                                    setSelectedUserVoucherId(null);
                                                }}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') handleApplyVoucher();
                                                }}
                                            />
                                            <button 
                                                className="btn btn-outline-primary" 
                                                type="button"
                                                onClick={handleApplyVoucher}
                                            >
                                                Áp dụng
                                            </button>
                                        </div>
                                        {voucherError && <small className="text-danger">{voucherError}</small>}
                                        {voucherDiscount > 0 && (
                                            <div className="d-flex justify-content-between mt-2">
                                                <small className="text-success">Voucher: {voucherCode}</small>
                                                <small className="text-success fw-bold">-{formatVND(voucherDiscount)}</small>
                                            </div>
                                        )}
                                        <div className="mt-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <small className="text-muted text-uppercase">Voucher của bạn</small>
                                                <Link to="/vouchers" className="small text-decoration-none">Kho voucher</Link>
                                            </div>
                                            {loadingMyVouchers ? (
                                                <small className="text-muted d-block mt-2">Đang tải voucher đã lưu...</small>
                                            ) : (
                                                <>
                                                    {availableSavedVouchers.length > 0 ? (
                                                        <div className="d-flex flex-wrap mt-2" style={{ gap: '0.5rem' }}>
                                                            {availableSavedVouchers.map(v => {
                                                                const isActive = selectedUserVoucherId === v.user_voucher_id;
                                                                return (
                                                                <button
                                                                    type="button"
                                                                    key={v.user_voucher_id}
                                                                    className={`btn btn-sm ${isActive ? 'btn-primary text-white' : 'btn-outline-primary'}`}
                                                                    onClick={() => handleSelectSavedVoucher(v)}
                                                                >
                                                                    <div className="fw-bold text-uppercase">{v.code}</div>
                                                                    <small className={`d-block ${isActive ? 'text-light' : 'text-muted'}`}>
                                                                        {v.discount_type === 'percent' ? `-${v.discount_value}%` : `-${formatVND(v.discount_value)}`}
                                                                    </small>
                                                                </button>
                                                            );})}
                                                        </div>
                                                    ) : (
                                                        <small className="text-muted d-block mt-2">
                                                            {hasAuthToken ? 'Bạn chưa lưu voucher nào' : 'Đăng nhập để xem voucher đã lưu'}
                                                        </small>
                                                    )}
                                                </>
                                            )}
                                            {!hasAuthToken && (
                                                <small className="d-block mt-2">
                                                    <Link to="/login">Đăng nhập</Link> hoặc <Link to="/signup">tạo tài khoản</Link> để sưu tầm voucher.
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {getTotalQuantity() < promoSettings.bulk_threshold && promoSettings.bulk_discount > 0 && (
                                    <div className="alert alert-info py-2 mb-2">
                                        <small>
                                            <i className="fa fa-info-circle me-1"></i>
                                            Mua thêm {promoSettings.bulk_threshold - getTotalQuantity()} sản phẩm để được giảm {promoSettings.bulk_discount}%
                                        </small>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h6 className="font-weight-medium mb-0">Phí vận chuyển</h6>
                                        {(getSubtotal() - getTotalDiscount()) >= shippingSettings.free_threshold ? (
                                            <small className="text-success">Miễn phí (đơn ≥ {formatVND(shippingSettings.free_threshold)})</small>
                                        ) : (
                                            <small className="text-muted">Miễn phí từ {formatVND(shippingSettings.free_threshold)}</small>
                                        )}
                                    </div>
                                    <h6 className="font-weight-medium mb-0">
                                        {getShippingFee() === 0 ? (
                                            <span className="text-success">Miễn phí</span>
                                        ) : (
                                            formatVND(getShippingFee())
                                        )}
                                    </h6>
                                </div>
                                {(shippingSettings.delivery_days || shippingSettings.areas) && (
                                    <div className="small text-muted mb-3" style={{textAlign: 'left'}}>
                                        {shippingSettings.delivery_days && (
                                            <div><i className="fa fa-clock me-1"></i>Dự kiến giao hàng: {shippingSettings.delivery_days} ngày</div>
                                        )}
                                        {shippingSettings.areas && (
                                            <div><i className="fa fa-map-marker-alt me-1"></i>Khu vực: {shippingSettings.areas}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="card-footer bg-transparent border-0 pt-0">
                                <hr />
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    <h5 className="font-weight-bold text-uppercase mb-0">Tổng cộng</h5>
                                    <h4 className="font-weight-bold text-primary mb-0">{formatVND(getTotal())}</h4>
                                </div>
                            </div>
                        </div>
                        {/* Các lựa chọn phương thức thanh toán */}
                        <div className="card border-secondary mb-5">
                            <div className="card-header bg-secondary border-0">
                                <h4 className="font-weight-semi-bold m-0">Phương thức thanh toán</h4>
                            </div>
                            <div className="card-body">
                                {paymentSettings.enable_cod && (
                                    <div className="form-group mb-2">
                                        <div className="custom-control custom-radio">
                                            <input
                                                type="radio"
                                                className="custom-control-input"
                                                name="paymentMethod"
                                                id="cod"
                                                value="cod"
                                                checked={formData.paymentMethod === 'cod'}
                                                onChange={handleInputChange}
                                            />
                                            <label className="custom-control-label" htmlFor="cod">Thanh toán khi nhận hàng (COD)</label>
                                        </div>
                                    </div>
                                )}
                                {paymentSettings.enable_bank && (
                                    <div className="form-group mb-2">
                                        <div className="custom-control custom-radio">
                                            <input
                                                type="radio"
                                                className="custom-control-input"
                                                name="paymentMethod"
                                                id="banktransfer"
                                                value="banktransfer"
                                                checked={formData.paymentMethod === 'banktransfer'}
                                                onChange={handleInputChange}
                                            />
                                            <label className="custom-control-label" htmlFor="banktransfer">Chuyển khoản ngân hàng</label>
                                        </div>
                                        {formData.paymentMethod === 'banktransfer' && paymentSettings.bank_info && (
                                            <div className="mt-3 p-3 bg-light rounded border">
                                                <div className="small" style={{ whiteSpace: 'pre-line' }}>
                                                    {paymentSettings.bank_info.split('\n').map((line, idx) => (
                                                        <div key={idx} className="mb-1">{line}</div>
                                                    ))}
                                                </div>
                                                <div className="mt-2 mb-0">
                                                    <strong>Nội dung chuyển khoản:</strong> DH-{new Date().getFullYear()}-<em>{formData.mobile || 'SĐT'}</em>
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary ms-2"
                                                        onClick={() => {
                                                            const content = `DH-${new Date().getFullYear()}-${formData.mobile || 'SĐT'}`;
                                                            navigator.clipboard.writeText(content);
                                                            toast.success('Đã copy nội dung chuyển khoản');
                                                        }}>Copy</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {paymentSettings.enable_ewallet && (
                                    <div className="form-group mb-2">
                                        <div className="custom-control custom-radio">
                                            <input
                                                type="radio"
                                                className="custom-control-input"
                                                name="paymentMethod"
                                                id="ewallet"
                                                value="ewallet"
                                                checked={formData.paymentMethod === 'ewallet'}
                                                onChange={handleInputChange}
                                            />
                                            <label className="custom-control-label" htmlFor="ewallet">Ví điện tử (Momo, ZaloPay)</label>
                                        </div>
                                        {formData.paymentMethod === 'ewallet' && (
                                            <div className="mt-3 p-3 bg-light rounded border">
                                                <small className="text-muted">Thanh toán qua ví điện tử sẽ được xử lý sau khi đặt hàng.</small>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!paymentSettings.enable_cod && !paymentSettings.enable_bank && !paymentSettings.enable_ewallet && (
                                    <div className="alert alert-warning">
                                        <small>Hiện tại không có phương thức thanh toán nào được kích hoạt. Vui lòng liên hệ admin.</small>
                                    </div>
                                )}
                            </div>
                            <div className="card-footer border-secondary bg-transparent">
                                <button
                                    className="btn btn-lg btn-block btn-primary font-weight-bold my-3 py-3"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                        if (!formData.paymentMethod) {
                                            toast.info('Vui lòng chọn phương thức thanh toán');
                                            return;
                                        }
                                        if (!validateForm()) return;
                                        handlePlaceOrder();
                                    }}>
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                                            Đang xử lý...
                                        </>
                                    ) : 'Đặt hàng'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <Footer />
        </Fragment>
    );
}

export default Checkout;