import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Footer from '../Footer';
import { formatVND, parseVND } from '../../utils/currency';
import { toast } from 'react-toastify';

function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.info('Bạn cần đăng nhập để xem đơn hàng');
            navigate('/login');
            return;
        }

        // Fetch orders
        axios.get('/api/my-orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            setOrders(response.data || []);
            setLoading(false);
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập đã hết hạn');
                localStorage.removeItem('token');
                localStorage.removeItem('userEmail');
                navigate('/login');
            } else {
                toast.error('Lỗi khi tải danh sách đơn hàng');
            }
            setLoading(false);
        });
    }, [navigate]);

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
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCartItems = (order) => {
        if (!order) return [];
        if (Array.isArray(order.cartItems)) return order.cartItems;
        if (typeof order.cartItems === 'string') {
            try {
                const parsed = JSON.parse(order.cartItems);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        }
        return [];
    };

    const calcSubtotal = (items) => {
        return items.reduce((sum, item) => {
            const price = parseVND(item.price || 0);
            const qty = Number(item.quantity) || 0;
            return sum + price * qty;
        }, 0);
    };

    const deriveDisplayTotal = (order) => {
        const subtotal = calcSubtotal(getCartItems(order));
        const voucherDiscount = Number(order?.discount_amount) || 0;
        const storedRaw = order?.total ?? '';
        const cleaned = String(storedRaw).replace(/[^\d.,]/g, '');
        const normalized = cleaned.replace(/(\d+)\.(\d{3}),(\d{2})$/, '$1$2');
        const stored = parseVND(normalized);
        if (stored > 0) return stored;
        return Math.max(0, subtotal - voucherDiscount);
    };

    return (
        <Fragment>
            <Header />
            
            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '200px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Đơn hàng của tôi</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Đơn hàng của tôi</p>
                    </div>
                </div>
            </div>

            <div className="container-fluid py-5">
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Đang tải...</span>
                        </div>
                        <p className="mt-3">Đang tải danh sách đơn hàng...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-5">
                        <i className="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                        <h4 className="text-muted">Bạn chưa có đơn hàng nào</h4>
                        <p className="text-muted">Hãy bắt đầu mua sắm ngay!</p>
                        <a href="/shop" className="btn btn-primary mt-3">Đến cửa hàng</a>
                    </div>
                ) : (
                    <div className="row">
                        <div className="col-12">
                            <div className="card shadow-sm">
                                <div className="card-header bg-white">
                                    <h5 className="mb-0"><i className="fas fa-list me-2"></i>Danh sách đơn hàng ({orders.length})</h5>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '10%' }}>Mã đơn</th>
                                                    <th style={{ width: '20%' }}>Ngày đặt</th>
                                                    <th style={{ width: '15%' }}>Số sản phẩm</th>
                                                    <th style={{ width: '15%' }}>Tổng tiền</th>
                                                    <th style={{ width: '15%' }}>Trạng thái</th>
                                                    <th style={{ width: '15%' }}>Thanh toán</th>
                                                    <th style={{ width: '10%' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map((order) => {
                                                    const items = getCartItems(order);
                                                    const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                                                    const total = deriveDisplayTotal(order);
                                                    
                                                    const voucherDiscount = Number(order.discount_amount) || 0;
                                                    const voucherCode = order.voucher_code || '';
                                                    return (
                                                        <tr key={order.id}>
                                                            <td><strong>#{order.id}</strong></td>
                                                            <td>{formatDate(order.created_at)}</td>
                                                            <td>{itemCount} sản phẩm</td>
                                                            <td className="fw-bold text-primary">
                                                                {formatVND(total)}
                                                                {voucherDiscount > 0 && (
                                                                    <div className="small text-muted">
                                                                        Voucher {voucherCode || ''}: -{formatVND(voucherDiscount)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>{getStatusBadge(order.status)}</td>
                                                            <td>
                                                                {order.paymentMethod === 'cod' ? (
                                                                    <span className="badge bg-secondary">COD</span>
                                                                ) : (
                                                                    <span className="badge bg-success">Chuyển khoản</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() => navigate(`/my-orders/${order.id}`)}
                                                                >
                                                                    <i className="fas fa-eye me-1"></i>Chi tiết
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </Fragment>
    );
}

export default MyOrders;

