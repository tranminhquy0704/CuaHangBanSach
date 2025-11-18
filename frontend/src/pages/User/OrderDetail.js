import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Footer from '../Footer';
import { formatVND, parseVND } from '../../utils/currency';
import { toast } from 'react-toastify';

function OrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.info('Bạn cần đăng nhập để xem chi tiết đơn hàng');
            navigate('/login');
            return;
        }

        // Fetch order detail
        axios.get(`/api/my-orders/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            setOrder(response.data);
            setLoading(false);
        })
        .catch(error => {
            console.error('Error fetching order detail:', error);
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập đã hết hạn');
                localStorage.removeItem('token');
                localStorage.removeItem('userEmail');
                navigate('/login');
            } else if (error.response?.status === 404) {
                toast.error('Không tìm thấy đơn hàng');
                navigate('/my-orders');
            } else {
                toast.error('Lỗi khi tải chi tiết đơn hàng');
            }
            setLoading(false);
        });
    }, [id, navigate]);

    // Format status with badge
    const getStatusBadge = (status) => {
        const statusMap = {
            'pending': { text: 'Chờ xử lý', class: 'badge bg-warning text-dark' },
            'paid': { text: 'Đã thanh toán', class: 'badge bg-info text-white' },
            'shipped': { text: 'Đang giao', class: 'badge bg-primary text-white' },
            'completed': { text: 'Hoàn thành', class: 'badge bg-success text-white' },
            'canceled': { text: 'Đã hủy', class: 'badge bg-danger text-white' }
        };
        const statusInfo = statusMap[status] || { text: status, class: 'badge bg-secondary text-white' };
        return <span className={statusInfo.class}>{statusInfo.text}</span>;
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Parse cartItems
    const getCartItems = () => {
        if (!order) return [];
        if (Array.isArray(order.cartItems)) return order.cartItems;
        if (typeof order.cartItems === 'string') {
            try {
                const parsed = JSON.parse(order.cartItems);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    // Calculate subtotal & derived total
    const calculateSubtotal = (items) => {
        return items.reduce((sum, item) => {
            const price = parseVND(item.price || 0);
            const quantity = Number(item.quantity) || 0;
            return sum + (price * quantity);
        }, 0);
    };

    const deriveFinalTotal = (items) => {
        const subtotal = calculateSubtotal(items);
        const voucherDiscount = Number(order?.discount_amount) || 0;
        const storedRaw = order?.total ?? '';
        const cleaned = String(storedRaw).replace(/[^\d.,]/g, '');
        const normalized = cleaned.replace(/(\d+)\.(\d{3}),(\d{2})$/, '$1$2');
        const stored = parseVND(normalized);
        const total = stored > 0 ? stored : Math.max(0, subtotal - voucherDiscount);
        const promoDiscount = Math.max(0, subtotal - voucherDiscount - total);
        return { subtotal, voucherDiscount, promoDiscount, total };
    };

    if (loading) {
        return (
            <Fragment>
                <Header />
                <div className="container-fluid py-5">
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Đang tải...</span>
                        </div>
                        <p className="mt-3">Đang tải chi tiết đơn hàng...</p>
                    </div>
                </div>
                <Footer />
            </Fragment>
        );
    }

    if (!order) {
        return (
            <Fragment>
                <Header />
                <div className="container-fluid py-5">
                    <div className="text-center py-5">
                        <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h4 className="text-muted">Không tìm thấy đơn hàng</h4>
                        <a href="/my-orders" className="btn btn-primary mt-3">Quay lại danh sách đơn hàng</a>
                    </div>
                </div>
                <Footer />
            </Fragment>
        );
    }

    const items = getCartItems();
    const { subtotal, voucherDiscount, promoDiscount, total } = deriveFinalTotal(items);
    const shippingAdjustment = Math.max(0, total - (subtotal - voucherDiscount - promoDiscount));
    const voucherCode = order?.voucher_code || '';

    return (
        <Fragment>
            <Header />
            
            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '200px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Chi tiết đơn hàng</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0"><a href="/my-orders">Đơn hàng của tôi</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Chi tiết đơn hàng #{order.id}</p>
                    </div>
                </div>
            </div>

            <div className="container-fluid py-5">
                <div className="row">
                    <div className="col-lg-8">
                        {/* Order Items */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-white">
                                <h5 className="mb-0"><i className="fas fa-shopping-bag me-2"></i>Sản phẩm trong đơn hàng</h5>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '10%' }}>Hình ảnh</th>
                                                <th style={{ width: '40%' }}>Tên sản phẩm</th>
                                                <th style={{ width: '15%' }} className="text-center">Số lượng</th>
                                                <th style={{ width: '20%' }} className="text-end">Đơn giá</th>
                                                <th style={{ width: '15%' }} className="text-end">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-4 text-muted">
                                                        Không có sản phẩm trong đơn hàng
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.map((item, index) => {
                                                    const itemPrice = parseVND(item.price || 0);
                                                    const itemQuantity = Number(item.quantity) || 0;
                                                    const itemTotal = itemPrice * itemQuantity;
                                                    
                                                    return (
                                                        <tr key={index}>
                                                            <td>
                                                                <img 
                                                                    src={item.img || '/assets/img/default-product.jpg'} 
                                                                    alt={item.name || 'Sản phẩm'}
                                                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <strong>{item.name || 'Sản phẩm'}</strong>
                                                            </td>
                                                            <td className="text-center">{itemQuantity}</td>
                                                            <td className="text-end">{formatVND(itemPrice)}</td>
                                                            <td className="text-end fw-bold">{formatVND(itemTotal)}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        {/* Order Info */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-white">
                                <h5 className="mb-0"><i className="fas fa-info-circle me-2"></i>Thông tin đơn hàng</h5>
                            </div>
                            <div className="card-body">
                                <div className="mb-3">
                                    <strong>Mã đơn hàng:</strong>
                                    <div className="text-muted">#{order.id}</div>
                                </div>
                                <div className="mb-3">
                                    <strong>Ngày đặt hàng:</strong>
                                    <div className="text-muted">{formatDate(order.created_at)}</div>
                                </div>
                                <div className="mb-3">
                                    <strong>Trạng thái:</strong>
                                    <div>{getStatusBadge(order.status)}</div>
                                </div>
                                <div className="mb-3">
                                    <strong>Phương thức thanh toán:</strong>
                                    <div>
                                        {order.paymentMethod === 'cod' ? (
                                            <span className="badge bg-secondary">Thanh toán khi nhận hàng (COD)</span>
                                        ) : (
                                            <span className="badge bg-success">Chuyển khoản</span>
                                        )}
                                    </div>
                                </div>
                                {voucherDiscount > 0 && (
                                    <div className="mb-3">
                                        <strong>Voucher đã dùng:</strong>
                                        <div className="text-muted">{voucherCode || 'Đã áp dụng'}</div>
                                    </div>
                                )}
                                <hr />
                                <div className="mb-2">
                                    <div className="d-flex justify-content-between">
                                        <span>Tạm tính</span>
                                        <strong>{formatVND(subtotal)}</strong>
                                    </div>
                                    {promoDiscount > 0 && (
                                        <div className="d-flex justify-content-between text-success">
                                            <span>Giảm giá khuyến mãi</span>
                                            <strong>-{formatVND(promoDiscount)}</strong>
                                        </div>
                                    )}
                                    {voucherDiscount > 0 && (
                                        <div className="d-flex justify-content-between text-success">
                                            <span>Voucher {voucherCode ? `(${voucherCode})` : ''}</span>
                                            <strong>-{formatVND(voucherDiscount)}</strong>
                                        </div>
                                    )}
                                    {shippingAdjustment > 0 && (
                                        <div className="d-flex justify-content-between text-muted">
                                            <span>Phí vận chuyển (ước tính)</span>
                                            <strong>{formatVND(shippingAdjustment)}</strong>
                                        </div>
                                    )}
                                    <hr />
                                    <div className="d-flex justify-content-between align-items-center">
                                        <strong className="h5 mb-0">Tổng tiền</strong>
                                        <strong className="h5 text-primary mb-0">{formatVND(total)}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Info */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-white">
                                <h5 className="mb-0"><i className="fas fa-truck me-2"></i>Thông tin giao hàng</h5>
                            </div>
                            <div className="card-body">
                                <div className="mb-3">
                                    <strong>Người nhận:</strong>
                                    <div className="text-muted">{order.fullName}</div>
                                </div>
                                <div className="mb-3">
                                    <strong>Số điện thoại:</strong>
                                    <div className="text-muted">{order.mobile}</div>
                                </div>
                                <div className="mb-3">
                                    <strong>Địa chỉ:</strong>
                                    <div className="text-muted">{order.address}</div>
                                </div>
                                <div className="mb-0">
                                    <strong>Tỉnh/Thành phố:</strong>
                                    <div className="text-muted">{order.state}</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <button 
                                    className="btn btn-outline-secondary w-100 mb-2"
                                    onClick={() => navigate('/my-orders')}
                                >
                                    <i className="fas fa-arrow-left me-2"></i>Quay lại danh sách
                                </button>
                                <button 
                                    className="btn btn-primary w-100"
                                    onClick={() => navigate('/shop')}
                                >
                                    <i className="fas fa-shopping-cart me-2"></i>Tiếp tục mua sắm
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

export default OrderDetail;

