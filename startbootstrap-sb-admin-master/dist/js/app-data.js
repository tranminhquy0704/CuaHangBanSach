(function(){
  const fmtVND = n => (Number(n)||0).toLocaleString('vi-VN') + ' ₫';
  const qs = sel => document.querySelector(sel);
  const fmtDelta = (current, previous, suffix) => {
    const cur = Number(current)||0;
    const prev = Number(previous)||0;
    if (prev <= 0 && cur <= 0) return '0% ' + suffix;
    if (prev <= 0) return '+100% ' + suffix;
    const diff = ((cur - prev) / prev) * 100;
    const sign = diff > 0 ? '+' : '';
    return sign + diff.toFixed(1) + '% ' + suffix;
  };
  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  function getMetricsBaseDate() {
    const input = document.getElementById('metrics-date');
    if (input && input.value) {
      const d = new Date(input.value + 'T00:00:00');
      if (!isNaN(d)) return d;
    }
    return new Date();
  }

  function getMetricsBaseDateString() {
    const d = getMetricsBaseDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  async function loadMetrics(){
    try{
      const token = localStorage.getItem('token');
      if(!token) return;
      const dateStr = getMetricsBaseDateString();
      const data = await fetchJSON('/admin/metrics?date=' + encodeURIComponent(dateStr), { headers: { 'Authorization': 'Bearer '+token } });
      if(data && data.revenueToday != null){
        const el = qs('#metric-revenue');
        if (el) el.textContent = fmtVND(data.revenueToday);
        const dEl = qs('#metric-revenue-delta');
        if (dEl) dEl.textContent = fmtDelta(data.revenueToday, data.revenueYesterday, 'so với hôm qua');
      }
      if (data && data.lowStockCount != null) {
        const lowEl = qs('#metric-lowstock');
        if (lowEl) lowEl.textContent = String(Number(data.lowStockCount)||0);
      }
      if (data && data.newCustomers7 != null) {
        const uDeltaEl = qs('#metric-customers-delta');
        if (uDeltaEl) uDeltaEl.textContent = fmtDelta(data.newCustomers7, data.newCustomersPrev7, 'so với 7 ngày trước');
      }
    }catch(e){
      console.warn('loadMetrics', e);
    }
  }

  // Đơn hàng hôm nay + sản phẩm đã bán hôm nay
  async function loadTodayOrdersAndProducts() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const orders = await fetchJSON('/api/orders', { headers: { 'Authorization': 'Bearer '+token } });
      const arr = Array.isArray(orders) ? orders : [];
      const today = getMetricsBaseDate();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const isSameDay = (d1, d2) => d1 && d2 &&
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
      const norm = (v) => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d) ? null : d;
      };
      let orderCount = 0;
      let orderYesterday = 0;
      let productsToday = 0;
      let productsYesterday = 0;
      arr.forEach(o => {
        const d = norm(o.created_at || o.createdAt || o.date);
        if (isSameDay(d, today)) {
          orderCount += 1;
        } else if (isSameDay(d, yesterday)) {
          orderYesterday += 1;
        } else {
          return;
        }
        const items = Array.isArray(o.cartItems) ? o.cartItems : [];
        items.forEach(it => {
          const q = Number(it.quantity) || 0;
          if (isSameDay(d, today)) productsToday += q;
          if (isSameDay(d, yesterday)) productsYesterday += q;
        });
      });
      const ordEl = qs('#metric-orders'); if (ordEl) ordEl.textContent = orderCount;
      const ordDelta = qs('#metric-orders-delta'); if (ordDelta) ordDelta.textContent = fmtDelta(orderCount, orderYesterday, 'so với hôm qua');
      const prodEl = qs('#metric-products'); if (prodEl) prodEl.textContent = productsToday;
      const prodDelta = qs('#metric-products-delta'); if (prodDelta) prodDelta.textContent = fmtDelta(productsToday, productsYesterday, 'so với hôm qua');
    } catch (e) {
      console.warn('loadTodayOrdersAndProducts', e);
      const ordEl = qs('#metric-orders'); if (ordEl && !ordEl.textContent) ordEl.textContent = '0';
      const prodEl = qs('#metric-products'); if (prodEl && !prodEl.textContent) prodEl.textContent = '0';
    }
  }

  // Khách hàng mới trong 7 ngày gần nhất
  async function loadUsers() {
    try {
      const token = localStorage.getItem('token');
      const uEl = qs('#metric-customers');
      if (!token) { if (uEl) uEl.textContent = '0'; return; }
      const rows = await fetchJSON('/admin/customers/list', { headers: { 'Authorization': 'Bearer '+token } });
      const arr = Array.isArray(rows) ? rows : [];
      const end = getMetricsBaseDate();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 6);
      const norm = (v) => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d) ? null : d;
      };
      let count = 0;
      let prevCount = 0;
      arr.forEach(c => {
        const d = norm(c.created_at || c.createdAt);
        if (!d) return;
        if (d >= start && d <= end) count += 1;
        else if (d >= prevStart && d <= prevEnd) prevCount += 1;
      });
      if (uEl) uEl.textContent = count;
      const uDeltaEl = qs('#metric-customers-delta');
      if (uDeltaEl) uDeltaEl.textContent = fmtDelta(count, prevCount, 'so với 7 ngày trước');
    } catch (e) {
      console.warn('loadUsers', e);
      const uEl = qs('#metric-customers'); if (uEl && !uEl.textContent) uEl.textContent = '0';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('metrics-date');
    if (dateInput && !dateInput.value) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateInput.value = y + '-' + m + '-' + day;
    }
    const reloadAll = () => {
      loadMetrics();
      loadTodayOrdersAndProducts();
      loadUsers();
    };
    reloadAll();
    if (dateInput) {
      dateInput.addEventListener('change', reloadAll);
    }
  });
})();
