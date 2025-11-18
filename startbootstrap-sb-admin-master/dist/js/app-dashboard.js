(function(){
  const token = localStorage.getItem('token');
  if(!token){ return; }
  const headers = { 'Authorization': 'Bearer '+token };
  let chart;
  let pie;
  let weekly;
  let favorite;
  let topCust;
  let ordersDT;

  async function fetchJSON(url){ const r = await fetch(url, { headers }); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  
  function fmtStatus(status){
    const s = String(status||'').toLowerCase();
    const map = {
      'pending': { text: 'Chờ xử lý', class: 'bg-warning text-dark' },
      'paid': { text: 'Đã thanh toán', class: 'bg-info' },
      'shipped': { text: 'Đang giao', class: 'bg-primary' },
      'completed': { text: 'Hoàn thành', class: 'bg-success' },
      'canceled': { text: 'Đã hủy', class: 'bg-danger' }
    };
    const info = map[s] || { text: status || 'N/A', class: 'bg-secondary' };
    return `<span class="badge ${info.class}">${info.text}</span>`;
  }

  function render(labels, data){
    const ctx = document.getElementById('revenueChart');
    if(!ctx || typeof Chart === 'undefined') return;
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Doanh thu', lineTension: 0.3, backgroundColor: 'rgba(13,110,253,0.15)', borderColor: 'rgba(13,110,253,1)', data }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { xAxes: [{ gridLines:{ display:false } }], yAxes: [{ ticks: { beginAtZero: true } }] }, tooltips: { callbacks: { label: function(tooltipItem){ const v = Number(tooltipItem.yLabel)||0; return 'Doanh thu: '+v.toLocaleString('vi-VN')+' ₫'; } } } }
    });
  }

  async function loadFavorites(){
    try{
      const ctx = document.getElementById('favoriteChart');
      if(!ctx || typeof Chart === 'undefined') return;
      const res = await fetchJSON('/admin/products');
      const rows = Array.isArray(res)? res.slice(): [];
      rows.sort((a,b)=> Number(b.rating||0) - Number(a.rating||0));
      const top = rows.slice(0, 7);
      const labels = top.map(x=>{
        const name = x.name || x.product_name || ('SP '+x.id);
        return String(name).length>28? (String(name).slice(0,28)+'…') : String(name);
      });
      const values = top.map(x=> Number(x.rating||0));
      if(favorite) favorite.destroy();
      favorite = new Chart(ctx, {
        type: 'horizontalBar',
        data: { labels, datasets: [{ label: 'Đánh giá', backgroundColor: '#0d6efd', borderColor: '#0d6efd', data: values }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          legend: { display: false },
          scales: {
            xAxes: [{ ticks: { beginAtZero: true, suggestedMax: 5, stepSize: 1 } }],
            yAxes: [{ ticks: { mirror: false } }]
          },
          tooltips: { callbacks: { label: function(t){ const v=Number(t.xLabel)||0; return 'Đánh giá: '+v.toFixed(1)+'★'; } } }
        }
      });
    }catch(_){ }
  }

  async function loadWeekly(){
    try{
      const ctx = document.getElementById('weeklyChart');
      if(!ctx || typeof Chart === 'undefined') return;
      const res = await fetchJSON('/admin/charts/revenue-by-week');
      const labels = (res.weeks || []).map((w,i)=> 'Tuần ' + (i+1));
      const data = res.data || [];
      if(weekly) weekly.destroy();
      weekly = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Doanh thu tuần', lineTension: 0.3, backgroundColor: 'rgba(25,135,84,0.12)', borderColor: 'rgba(25,135,84,1)', pointRadius: 2, data }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { xAxes: [{ gridLines:{ display:false } }], yAxes: [{ ticks: { beginAtZero: true } }] }, tooltips: { callbacks: { label: function(tooltipItem){ const v = Number(tooltipItem.yLabel)||0; return 'Doanh thu: '+v.toLocaleString('vi-VN')+' ₫'; } } } }
      });
    }catch(_){ }
  }

  async function loadCategoryPie(){
    try{
      const res = await fetchJSON('/admin/top/best-sellers');
      const ctx = document.getElementById('revenueCategoryPie');
      if(!ctx || typeof Chart === 'undefined') return;
      if(pie) pie.destroy();
      const baseColors = ['#4c6ef5','#12b886','#fa5252','#fab005','#845ef7','#20c997','#fd7e14','#339af0','#e64980','#82c91e'];
      const rows = Array.isArray(res)? res.slice(): [];
      rows.sort((a,b)=> (Number(b.sold||b.quantity||0)) - (Number(a.sold||a.quantity||0)));
      const top = rows.slice(0,5);
      const rest = rows.slice(5);
      const restSum = rest.reduce((s,x)=> s + Number(x.sold||x.quantity||0), 0);
      const labelsRaw = top.map(x=> x.name||x.product_name||('SP '+x.id));
      const valuesRaw = top.map(x=> Number(x.sold||x.quantity||0));
      if(rest.length>0){ labelsRaw.push('Khác'); valuesRaw.push(restSum); }
      const labels = labelsRaw.map(s=>{ s=String(s||''); return s.length>24? (s.slice(0,24)+'…') : s; });
      const values = valuesRaw;
      const total = values.reduce((a,b)=>a+b,0) || 1;
      const colors = baseColors.slice(0, labels.length);
      pie = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }] },
        options: {
          cutoutPercentage: 55,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
          tooltips: {
            callbacks: {
              label: function(tooltipItem, data){
                const idx = tooltipItem.index;
                const val = values[idx]||0;
                const pct = ((val/total)*100).toFixed(1)+'%';
                const name = labels[idx]||'';
                return name+': '+val.toLocaleString('vi-VN')+' ('+pct+')';
              }
            }
          },
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, fontSize: 12, fontColor: '#495057', usePointStyle: true } }
        }
      });
    }catch(e){ /* silent */ }
  }

  async function load(by){
    try{
      if(by === 'year' || by === 'month'){
        const res = await fetchJSON('/admin/charts/revenue-by-month');
        const labels = (res.months || []).map((m,i)=> 'Thg ' + (i+1));
        const data = res.data || [];
        return render(labels, data);
      }
      if(by === 'week'){
        const res = await fetchJSON('/admin/charts/revenue-by-week');
        const labels = (res.weeks || []).map((w,i)=> 'Tuần ' + (i+1));
        const data = res.data || [];
        return render(labels, data);
      }
      // day view keeps original aggregation
      const res = await fetchJSON('/admin/charts/revenue?by=day');
      return render(res.labels||[], res.data||[]);
    }catch(e){
      // if any error, try month series as safe fallback
      try{
        const res = await fetchJSON('/admin/charts/revenue-by-month');
        const labels = (res.months || []).map((m,i)=> 'Thg ' + (i+1));
        const data = res.data || [];
        return render(labels, data);
      }catch(_){ /* ignore */ }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('revenue-by');
    if(!sel) return;
    load(sel.value || 'month');
    sel.addEventListener('change', () => load(sel.value));
    loadCategoryPie();
    loadWeekly();
    loadFavorites();

    // Highlights: Low stock
    (async function(){
      try{
        const body = document.getElementById('lowStockBody');
        if(!body) return;
        const res = await fetchJSON('/admin/stats/low-stock?limit=5');
        const rows = Array.isArray(res)? res: [];
        if(rows.length===0){ body.innerHTML = '<tr><td colspan="3" class="text-center py-3">Không có dữ liệu</td></tr>'; return; }
        const tr = r=> `<tr><td>${(r.name||'').slice(0,30)}</td><td class="text-end">${Number(r.stock||0)}</td><td class="text-end">${Number(r.sold||0)}</td></tr>`;
        body.innerHTML = rows.map(tr).join('');
      }catch(_){ const body = document.getElementById('lowStockBody'); if(body) body.innerHTML = '<tr><td colspan="3" class="text-center py-3">Lỗi tải dữ liệu</td></tr>'; }
    })();

    // Highlights: New customers (7 days)
    (async function(){
      try{
        const listEl = document.getElementById('newCustList');
        const countEl = document.getElementById('newCustCount');
        if(!listEl || !countEl) return;
        const res = await fetchJSON('/admin/stats/new-customers?days=7');
        const rows = Array.isArray(res)? res: [];
        countEl.textContent = rows.length;
        const li = r=> `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${(r.name||r.email||'').slice(0,28)}</span><small class="text-muted">${new Date(r.first_order).toLocaleDateString('vi-VN')}</small></li>`;
        listEl.innerHTML = rows.slice(0,5).map(li).join('') || '<li class="list-group-item">Không có dữ liệu</li>';
      }catch(_){ const listEl = document.getElementById('newCustList'); if(listEl) listEl.innerHTML = '<li class="list-group-item">Lỗi tải dữ liệu</li>'; }
    })();

    // Highlights: Top customers by revenue
    (async function(){
      try{
        const ctx = document.getElementById('topCustomersChart');
        if(!ctx || typeof Chart === 'undefined') return;
        const res = await fetchJSON('/admin/stats/top-customers?limit=5');
        const rows = Array.isArray(res)? res: [];
        const labels = rows.map(r=> String(r.name||r.email||'').slice(0,20)+(String(r.name||r.email||'').length>20?'…':''));
        const vals = rows.map(r=> Number(r.revenue||0));
        if(topCust) topCust.destroy();
        topCust = new Chart(ctx, { type:'horizontalBar', data:{ labels, datasets:[{ label:'Doanh thu', backgroundColor:'#20c997', borderColor:'#20c997', data: vals }] }, options:{ responsive:true, maintainAspectRatio:false, legend:{display:false}, scales:{ xAxes:[{ ticks:{ beginAtZero:true, callback:(v)=> (Number(v)||0).toLocaleString('vi-VN')+' ₫' } }], yAxes:[{ ticks:{ mirror:false } }] }, tooltips:{ callbacks:{ label:(t)=> { const v=Number(t.xLabel)||0; return v.toLocaleString('vi-VN')+' ₫'; } } } } });
      }catch(_){ /* ignore */ }
    })();

    // Navigate to SPA views when clicking the 4 metric cards
    try{
      const rows = document.querySelectorAll('#view-overview .row');
      if(rows && rows.length){
        const firstRow = rows[0];
        const cards = firstRow.querySelectorAll('.card');
        const routes = ['#/revenue','#/orders','#/books','#/customers'];
        function bind(card, idx){
          const route = routes[idx];
          if(!route) return;
          card.style.cursor = 'pointer';
          card.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); location.hash = route; });
          const a = card.querySelector('a.stretched-link');
          if(a){
            a.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); location.hash = route; });
          }
        }
        cards.forEach((card, idx)=>{ if(idx<4) bind(card, idx); });
      }
    }catch(_){ /* ignore */ }

    // Load Recent Orders into the template table and localize headers
    (async function(){
      try{
        const table = document.getElementById('datatablesSimple');
        if(!table) return;
        const thead = table.querySelector('thead');
        const tfoot = table.querySelector('tfoot');
        const tbody = table.querySelector('tbody');
        if(thead) thead.innerHTML = '<tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng</th><th>Trạng thái</th></tr>';
        if(tfoot) tfoot.innerHTML = '<tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng</th><th>Trạng thái</th></tr>';
        const rows = await fetchJSON('/admin/orders/recent?limit=10');
        const fmtDate = s=>{ try{return new Date(s).toLocaleString('vi-VN');}catch(_){return s||'';} };
        const toNumber = v=> {
          if (typeof v === 'number') return v;
          const num = Number(String(v||'').replace(/[^0-9.-]/g,''));
          return isNaN(num) ? 0 : num;
        };
        const vnd = n=> (toNumber(n)||0).toLocaleString('vi-VN')+' ₫';
        if(tbody){
          tbody.innerHTML = (rows||[]).map(o=>`<tr><td>${o.id}</td><td>${o.fullName||o.customer||''}</td><td>${fmtDate(o.created_at||o.date)}</td><td>${vnd(o.total)}</td><td>${fmtStatus(o.status)}</td></tr>`).join('');
        }
        if(window.simpleDatatables && table){
          try{ if(ordersDT) { ordersDT.destroy(); } }catch(_){ }
          ordersDT = new simpleDatatables.DataTable(table, {
            labels: {
              placeholder: 'Tìm kiếm...',
              perPage: '{select} mục mỗi trang',
              perPageSelect: [5,10,25,50],
              noRows: 'Không có dữ liệu',
              info: 'Hiển thị {start}–{end} của {rows} mục',
              noResults: 'Không tìm thấy kết quả',
              infoFiltered: '(lọc từ {rowsTotal} mục)'
            },
            perPage: 5
          });
        }
      }catch(_){ /* ignore */ }
    })();
  });
})();
