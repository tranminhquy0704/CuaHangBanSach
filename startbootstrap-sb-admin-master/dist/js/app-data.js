(function(){
  const fmtVND = n => (Number(n)||0).toLocaleString('vi-VN') + ' ₫';
  const qs = sel => document.querySelector(sel);
  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  async function loadMetrics(){
    try{
      const token = localStorage.getItem('token');
      if(!token) return;
      const data = await fetchJSON('/admin/metrics', { headers: { 'Authorization': 'Bearer '+token } });
      if(data){
        // Doanh thu hôm nay - dùng revenueToday từ backend
        if (data.revenueToday != null) { const el = qs('#metric-revenue'); if (el) el.textContent = fmtVND(data.revenueToday); }
        if (data.ordersCount != null) { const el = qs('#metric-orders'); if (el) el.textContent = Number(data.ordersCount)||0; }
        if (data.productsCount != null) { const el = qs('#metric-products'); if (el) el.textContent = Number(data.productsCount)||0; }
        if (data.customersCount != null) { const el = qs('#metric-customers'); if (el) el.textContent = Number(data.customersCount)||0; }
      }
    }catch(e){
      const ordEl = qs('#metric-orders'); if (ordEl && !ordEl.textContent) ordEl.textContent = '0';
      const cusEl = qs('#metric-customers'); if (cusEl && !cusEl.textContent) cusEl.textContent = '0';
    }
  }

  async function loadProducts() {
    try {
      const products = await fetchJSON('/api/products');
      const revenue = (Array.isArray(products) ? products : []).reduce((s,p)=> s + (Number(p.price)||0)*(Number(p.sold)||0), 0);
      const revEl = qs('#metric-revenue'); if (revEl) revEl.textContent = fmtVND(revenue);
      const prodCount = (Array.isArray(products) ? products.length : 0);
      const prodEl = qs('#metric-products'); if (prodEl) prodEl.textContent = prodCount;
    } catch (e) { console.error('loadProducts', e); }
  }

  async function loadOrders() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return; // only if admin logged in
      const orders = await fetchJSON('/api/orders', { headers: { 'Authorization': 'Bearer '+token } });
      const count = Array.isArray(orders) ? orders.length : 0;
      const ordEl = qs('#metric-orders'); if (ordEl) ordEl.textContent = count;
    } catch (e) { console.warn('loadOrders', e); const ordEl = qs('#metric-orders'); if (ordEl && !ordEl.textContent) ordEl.textContent = '0'; }
  }

  async function loadUsers() {
    try {
      const token = localStorage.getItem('token');
      if (!token) { const uEl = qs('#metric-customers'); if (uEl) uEl.textContent = '0'; return; }
      const res = await fetch('/admin/customers/count', { headers: { 'Authorization': 'Bearer '+token } });
      if (!res.ok) { const uEl = qs('#metric-customers'); if (uEl) uEl.textContent = '0'; return; }
      const data = await res.json();
      const uEl = qs('#metric-customers'); if (uEl) uEl.textContent = Number(data.total||0);
    } catch (e) { console.warn('loadUsers', e); const uEl = qs('#metric-customers'); if (uEl && !uEl.textContent) uEl.textContent = '0'; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadMetrics();
    loadProducts();
    loadOrders();
    loadUsers();
  });
})();
