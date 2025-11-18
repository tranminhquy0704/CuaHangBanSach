import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { formatVND } from '../../utils/currency';

const SBDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const prods = await axios.get('/api/products');
        setProducts(Array.isArray(prods.data) ? prods.data : []);
        // try fetch orders if admin token exists
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const od = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
            setOrders(Array.isArray(od.data) ? od.data : []);
          } catch (_) { /* ignore */ }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const metrics = useMemo(() => {
    const totalRevenue = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.sold) || 0), 0);
    const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= 5).length;
    const newOrders = orders.length; // recent fetch (no time filter)
    const newCustomers = 0; // not available from frontend; needs backend users endpoint
    return { totalRevenue, lowStockCount, newOrders, newCustomers };
  }, [products, orders]);

  const bestSellers = useMemo(() => {
    return [...products].sort((a,b) => (b.sold||0) - (a.sold||0)).slice(0,5);
  }, [products]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .map(o => ({...o, created_at: o.created_at || o.createdAt}))
      .sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0))
      .slice(0,10);
  }, [orders]);

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Tổng doanh thu (ước tính)</div>
                <div className="fs-4 text-primary">{formatVND(metrics.totalRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Đơn hàng tải được</div>
                <div className="fs-4">{metrics.newOrders}</div>
                <div className="text-muted small">Cần token admin để xem</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Sản phẩm sắp hết</div>
                <div className="fs-4">{metrics.lowStockCount}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Khách hàng mới</div>
                <div className="fs-4">{metrics.newCustomers}</div>
                <div className="text-muted small">(cần API users)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-lg-8">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <strong>Đơn gần đây</strong>
              </div>
              <div className="card-body p-0">
                {recentOrders.length === 0 ? (
                  <div className="p-3 text-muted small">Không có dữ liệu. Đăng nhập admin để xem đơn hàng.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Mã</th>
                          <th>Khách hàng</th>
                          <th>Ngày</th>
                          <th className="text-end">Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map(o => (
                          <tr key={o.id}>
                            <td>{o.id}</td>
                            <td>{o.fullName}</td>
                            <td>{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '-'}</td>
                            <td className="text-end">{formatVND(o.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <strong>Top bán chạy</strong>
              </div>
              <div className="card-body">
                {bestSellers.map(b => (
                  <div key={b.id} className="d-flex align-items-center mb-3">
                    <img src={b.img} alt={b.name} style={{width:44, height:44, objectFit:'cover'}} className="rounded me-2" />
                    <div className="flex-grow-1">
                      <div className="small text-truncate" title={b.name}>{b.name}</div>
                      <div className="text-muted small">Đã bán {b.sold || 0} • {formatVND(b.price)}</div>
                    </div>
                  </div>
                ))}
                {bestSellers.length === 0 && <div className="text-muted small">Chưa có dữ liệu</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SBDashboard;
