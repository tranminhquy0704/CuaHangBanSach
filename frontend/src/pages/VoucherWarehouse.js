import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Header from './Header';
import Footer from './Footer';
import { toast } from 'react-toastify';
import { formatVND } from '../utils/currency';

const VoucherWarehouse = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchVouchers = () => {
    setLoading(true);
    axios.get('/api/vouchers', { headers: authHeaders() })
      .then((res) => setVouchers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('Load vouchers error:', err);
        toast.error('Không tải được danh sách voucher');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleClaim = async (voucher) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.info('Vui lòng đăng nhập để nhận voucher');
      return;
    }
    if (!voucher?.id) return;
    setClaiming(voucher.id);
    try {
      await axios.post('/api/vouchers/claim', { voucherId: voucher.id }, { headers: authHeaders() });
      toast.success('Đã lưu voucher vào tài khoản');
      fetchVouchers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể nhận voucher');
    } finally {
      setClaiming(null);
    }
  };

  const renderVoucherCard = (voucher) => {
    const remaining = voucher.remaining;
    const isClaimed = voucher.claimed;
    const isUsed = voucher.user_voucher_used;
    const today = new Date();
    const startDate = voucher.start_date ? new Date(voucher.start_date) : null;
    const endDate = voucher.end_date ? new Date(voucher.end_date) : null;
    const upcoming = startDate && startDate > today;
    const expired = endDate && endDate < today;
    const outOfStock = remaining !== null && remaining <= 0;
    const disableClaim = expired || upcoming || outOfStock || isClaimed;
    const amountLabel = voucher.discount_type === 'percent'
      ? `Giảm ${voucher.discount_value}%`
      : `Giảm ${formatVND(voucher.discount_value)}`;
    return (
      <div className="col-md-6 col-lg-4 mb-4" key={voucher.id}>
        <div className="card h-100 shadow-sm border-0 voucher-card">
          <div className="card-body d-flex flex-column">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="badge badge-primary text-uppercase">{voucher.discount_type === 'percent' ? 'Phần trăm' : 'Giảm trực tiếp'}</span>
              {isClaimed && <span className={`badge ${isUsed ? 'badge-secondary' : 'badge-success'}`}>{isUsed ? 'Đã dùng' : 'Đã lưu'}</span>}
            </div>
            <h5 className="fw-bold text-primary mb-1">{voucher.name || voucher.code}</h5>
            <p className="text-muted small flex-grow-1">{voucher.description || 'Ưu đãi độc quyền từ Shop Bán Sách'}</p>

            <div className="mb-2">
              <div className="d-flex justify-content-between">
                <span className="text-dark fw-semibold">{amountLabel}</span>
                {voucher.min_order_amount > 0 && (
                  <small className="text-muted">ĐH tối thiểu {formatVND(voucher.min_order_amount)}</small>
                )}
              </div>
            </div>

            <ul className="list-unstyled small text-muted mb-3">
              {startDate && (
                <li><i className="fa fa-clock me-1"></i>Bắt đầu: {startDate.toLocaleDateString('vi-VN')}</li>
              )}
              {endDate && (
                <li><i className="fa fa-flag-checkered me-1"></i>Hết hạn: {endDate.toLocaleDateString('vi-VN')}</li>
              )}
              {remaining !== null && (
                <li><i className="fa fa-ticket-alt me-1"></i>Còn lại: {Math.max(0, remaining)}</li>
              )}
            </ul>

            <button
              className="btn btn-primary w-100 mt-auto"
              disabled={disableClaim || claiming === voucher.id}
              onClick={() => handleClaim(voucher)}
            >
              {expired ? 'Đã hết hạn' :
                upcoming ? 'Chưa bắt đầu' :
                  outOfStock ? 'Hết lượt' :
                    isClaimed ? (isUsed ? 'Đã sử dụng' : 'Đã lưu') :
                      claiming === voucher.id ? 'Đang lưu...' : 'Nhận voucher'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const visibleVouchers = useMemo(() => {
    const now = new Date();
    return vouchers.filter((voucher) => {
      const endDate = voucher.end_date ? new Date(voucher.end_date) : null;
      const expired = endDate && endDate < now;
      const used = Boolean(voucher.user_voucher_used);
      const outOfStock = voucher.remaining !== null && voucher.remaining <= 0;
      return !expired && !used && !outOfStock;
    });
  }, [vouchers]);

  return (
    <>
      <Header />
      <div className="container-fluid bg-secondary mb-5">
        <div
          className="d-flex flex-column align-items-center justify-content-center text-center"
          style={{ minHeight: '250px' }}
        >
          <h1 className="font-weight-semi-bold text-uppercase mb-3">Sưu tập voucher xịn</h1>
          <p className="text-muted mb-3">Săn ưu đãi độc quyền cho tài khoản của bạn.</p>
          <div className="d-inline-flex">
            <p className="m-0"><a href="/">Trang chủ</a></p>
            <p className="m-0 px-2">-</p>
            <p className="m-0">Kho voucher</p>
          </div>
        </div>
      </div>

      <section className="container py-5">
        <div className="mb-4">
          <h3 className="fw-bold mb-1">Voucher nổi bật</h3>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="text-muted">Đang tải voucher...</p>
          </div>
        ) : (
          <div className="row">
            {visibleVouchers.length === 0 ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted">Hiện chưa có voucher khả dụng.</p>
              </div>
            ) : (
              visibleVouchers.map(renderVoucherCard)
            )}
          </div>
        )}

      </section>

      <Footer />
    </>
  );
};

export default VoucherWarehouse;

