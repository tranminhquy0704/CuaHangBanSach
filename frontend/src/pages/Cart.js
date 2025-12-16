import React, { useState, useEffect, Fragment, useRef, useContext } from "react";
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate để điều hướng
import Header from "./Header";
import Footer from "./Footer";
import { toast } from 'react-toastify';
import { parseVND, formatVND } from '../utils/currency';
import { CartContext } from './CartContext';
import axios from 'axios';

function Cart() {
    const navigate = useNavigate(); // Tạo hàm điều hướng

    const { cart: items, addToCart, decreaseQuantity, removeFromCart, clearCart: contextClearCart } = useContext(CartContext);
    const [pendingClear, setPendingClear] = useState(false);
    const clearTimerRef = useRef(null);
    const [promoSettings, setPromoSettings] = useState({
        bulk_discount: 0,
        bulk_threshold: 5,
        enable_voucher: false
    });
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [voucherError, setVoucherError] = useState('');

    // Hàm cập nhật số lượng sản phẩm
    const updateQuantity = (id, delta) => {
        if (delta > 0) {
            // increase: dùng addToCart với quantity 1
            const item = items.find(i => i.id === id);
            if (item) addToCart({ ...item, quantity: 1 });
        } else if (delta < 0) {
            // decrease: gọi decreaseQuantity
            decreaseQuantity(id);
        }
    };

    // Hàm xóa sản phẩm khỏi giỏ hàng
    const removeItem = (id) => {
        removeFromCart(id);
    };

    // Hàm tính tổng phụ (subtotal) của giỏ hàng
    const getSubtotal = () => {
        return items.reduce((total, item) => total + parseVND(item.price) * (item.quantity || 1), 0);
    };

    // Hàm xóa toàn bộ giỏ hàng (xác nhận không chặn: nhấn 2 lần trong 3s)
    const clearCart = () => {
        if (!pendingClear) {
            setPendingClear(true);
            toast.warning('Nhấn lại lần nữa trong 3 giây để xác nhận xóa giỏ hàng');
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            clearTimerRef.current = setTimeout(() => setPendingClear(false), 3000);
            return;
        }
        setPendingClear(false);
        if (clearTimerRef.current) {
            clearTimeout(clearTimerRef.current);
            clearTimerRef.current = null;
        }
        contextClearCart();
        toast.success('Đã xóa toàn bộ giỏ hàng');
    };

    // Dọn dẹp timer khi unmount
    useEffect(() => {
        return () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        };
    }, []);

    // Fetch promo settings
    useEffect(() => {
        axios.get('/api/settings')
            .then(response => {
                if (response.data && typeof response.data === 'object') {
                    const settings = {};
                    Object.keys(response.data).forEach(key => {
                        settings[key] = response.data[key].value || '';
                    });
                    setPromoSettings({
                        bulk_discount: parseInt(settings['promo.bulk_discount']) || 0,
                        bulk_threshold: parseInt(settings['promo.bulk_threshold']) || 5,
                        enable_voucher: settings['promo.enable_voucher'] === 'true'
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching promo settings:', error);
            });
    }, []);

    // Tính tổng số lượng sản phẩm
    const getTotalQuantity = () => {
        return items.reduce((total, item) => total + (item.quantity || 1), 0);
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
    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) {
            setVoucherError('Vui lòng nhập mã voucher');
            return;
        }
        
        try {
            const response = await axios.post('/api/vouchers/validate', { code: voucherCode.trim() });
            const voucher = response.data;
            const subtotal = getSubtotal() - getBulkDiscount();
            
            // Check minimum order amount
            if (subtotal < voucher.min_order_amount) {
                setVoucherError(`Đơn hàng tối thiểu ${formatVND(voucher.min_order_amount)} để sử dụng voucher này`);
                setVoucherDiscount(0);
                return;
            }
            
            // Calculate discount
            let discount = 0;
            if (voucher.discount_type === 'percent') {
                discount = Math.round(subtotal * voucher.discount_value / 100);
                if (voucher.max_discount && discount > voucher.max_discount) {
                    discount = voucher.max_discount;
                }
            } else {
                discount = voucher.discount_value;
            }
            
            setVoucherDiscount(discount);
            setVoucherError('');
            toast.success('Áp dụng voucher thành công!');
        } catch (error) {
            setVoucherError(error.response?.data?.message || 'Mã voucher không hợp lệ');
            setVoucherDiscount(0);
        }
    };

    // Tính tổng giảm giá (bulk + voucher)
    const getTotalDiscount = () => {
        return getBulkDiscount() + voucherDiscount;
    };

    // Hàm xử lý chuyển hướng sang trang Checkout khi nhấn nút "Proceed To Checkout"
    const handleProceedToCheckout = () => {
        navigate('/checkout'); // Chuyển hướng đến trang Checkout
    };

    return (
        <Fragment>
            <Header />
            <div className="container-fluid bg-secondary mb-5">
                <div
                    className="d-flex flex-column align-items-center justify-content-center"
                    style={{ minHeight: '300px' }} >
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Giỏ hàng</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="Index">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Giỏ hàng</p>
                    </div>
                </div>
            </div>

            <div className="container-fluid pt-5">
                <div className="row px-xl-5">
                    <div className="col-lg-8 table-responsive mb-5">
                        {/* Hiển thị thông báo nếu giỏ hàng trống */}
                        {items.length === 0 ? (
                            <p>Giỏ hàng của bạn hiện tại chưa có sản phẩm nào.</p>
                        ) : (
                            <table className="table table-bordered mb-0">
                                <thead className="bg-secondary text-dark">
                                    <tr>
                                        <th>Sản phẩm</th>
                                        <th>Giá</th>
                                        <th>Số lượng</th>
                                        <th>Tổng</th>
                                        <th>Xóa</th>
                                    </tr>
                                </thead>
                                <tbody className="align-middle">
                                    {/* Hiển thị danh sách sản phẩm trong giỏ hàng */}
                                    {items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="align-middle text-start">
                                                <div className="d-flex align-items-center">
                                                    <img src={item.img} alt="" style={{ width: "56px" }} className="me-2" />
                                                    <span>{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="align-middle text-center">{formatVND(parseVND(item.price))}</td>
                                            <td className="align-middle">
                                                <div className="input-group input-group-sm" style={{ width: '110px', margin: '0 auto' }}>
                                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => updateQuantity(item.id, -1)}>
                                                        <i className="fas fa-minus"></i>
                                                    </button>
                                                    <input type="text" className="form-control form-control-sm text-center" value={item.quantity} readOnly />
                                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => updateQuantity(item.id, 1)}>
                                                        <i className="fas fa-plus"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="align-middle text-center">{formatVND(parseVND(item.price) * (item.quantity || 1))}</td>
                                            <td className="align-middle text-center">
                                                <button className="btn btn-outline-danger btn-sm" onClick={() => removeItem(item.id)}>
                                                    <i className="fa fa-times"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="col-lg-4">
                        <div className="card border-secondary mb-5">
                            <div className="card-header bg-secondary border-0">
                                <h4 className="font-weight-semi-bold m-0">Tóm tắt giỏ hàng</h4>
                            </div>
                            <div className="card-body">
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
                                {getTotalQuantity() < promoSettings.bulk_threshold && promoSettings.bulk_discount > 0 && (
                                    <div className="alert alert-info py-2 mb-0">
                                        <small>
                                            <i className="fa fa-info-circle me-1"></i>
                                            Mua thêm {promoSettings.bulk_threshold - getTotalQuantity()} sản phẩm để được giảm {promoSettings.bulk_discount}%
                                        </small>
                                    </div>
                                )}
                            </div>
                            <div className="card-footer border-secondary bg-transparent">
                                <div className="d-flex justify-content-between mt-2">
                                    <h5 className="font-weight-bold">Tổng cộng</h5>
                                    <h5 className="font-weight-bold">{formatVND(getSubtotal() - getTotalDiscount())}</h5>
                                </div>
                                <button className="btn btn-block btn-primary my-3 py-3" onClick={handleProceedToCheckout}>
                                   Thanh toán
                                </button>
                                <button className="btn btn-block btn-danger my-3 py-3" onClick={clearCart}>Xóa giỏ hàng</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </Fragment>
    );
}

export default Cart;