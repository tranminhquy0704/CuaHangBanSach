(function(){
  const token = localStorage.getItem('token');
  if(!token){ return; }
  const headers = { 'Authorization': 'Bearer '+token };
  let chart;
  let pie;
  let weekly;
  let favorite;
  let topCust;
  let recentOrdersChart;

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

  function renderOrders(labels, data){
    const ctx = document.getElementById('recentOrdersChart');
    if(!ctx || typeof Chart === 'undefined') return;
    if(recentOrdersChart) recentOrdersChart.destroy();
    recentOrdersChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Đơn hàng', lineTension: 0.3, backgroundColor: 'rgba(25,135,84,0.15)', borderColor: 'rgba(25,135,84,1)', data }] },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { 
          xAxes: [{ gridLines:{ display:false } }], 
          yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }] 
        }, 
        tooltips: { callbacks: { label: function(tooltipItem){ const v = Number(tooltipItem.yLabel)||0; return 'Đơn hàng: '+v.toLocaleString('vi-VN'); } } } 
      }
    });
  }

  // Thể loại được yêu thích nhất (top 5 thể loại theo doanh thu)
  async function loadFavorites(days){
    try{
      const ctx = document.getElementById('favoriteChart');
      if(!ctx || typeof Chart === 'undefined') return;
      const url = days && Number(days) > 0 ? '/admin/charts/revenue-by-category?days='+days : '/admin/charts/revenue-by-category';
      const res = await fetchJSON(url);
      const labels = Array.isArray(res.labels) ? res.labels : [];
      const data = Array.isArray(res.data) ? res.data : [];
      if(favorite) favorite.destroy();
      favorite = new Chart(ctx, {
        type: 'horizontalBar',
        data: { 
          labels,
          datasets: [{
            label: 'Doanh thu theo thể loại',
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            data
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          legend: { display: false },
          scales: {
            xAxes: [{
              ticks: { beginAtZero: true, callback: v => (Number(v)||0).toLocaleString('vi-VN') + ' ₫' }
            }],
            yAxes: [{ ticks: { mirror: false } }]
          },
          tooltips: { callbacks: { label: function(t){ const v=Number(t.xLabel)||0; return v.toLocaleString('vi-VN')+' ₫'; } } }
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

  // Thể loại được bán chạy nhất (top 5 thể loại theo doanh thu - biểu đồ cột)
  async function loadCategoryPie(days){
    try{
      const url = days && Number(days) > 0 ? '/admin/charts/revenue-by-category?days='+days : '/admin/charts/revenue-by-category';
      const res = await fetchJSON(url);
      const ctx = document.getElementById('revenueCategoryPie');
      if(!ctx || typeof Chart === 'undefined') return;
      if(pie) pie.destroy();
      const labels = Array.isArray(res.labels) ? res.labels : [];
      const values = Array.isArray(res.data) ? res.data : [];
      const colors = ['#4c6ef5','#12b886','#fa5252','#fab005','#845ef7','#20c997','#fd7e14','#339af0','#e64980','#82c91e'];
      pie = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Doanh thu theo thể loại',
            data: values,
            backgroundColor: labels.map((_,i)=> colors[i % colors.length]),
            borderColor: '#fff',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          legend: { display: false },
          scales: {
            yAxes: [{
              ticks: {
                beginAtZero: true,
                callback: v => (Number(v)||0).toLocaleString('vi-VN') + ' ₫'
              }
            }]
          },
          tooltips: {
            callbacks: {
              label: function(t){ const v = Number(t.yLabel)||0; return v.toLocaleString('vi-VN')+' ₫'; }
            }
          }
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

  async function loadOrders(by){
    try{
      const res = await fetchJSON('/admin/charts/orders?by='+(by||'month'));
      const labels = Array.isArray(res.labels) ? res.labels : [];
      const data = Array.isArray(res.data) ? res.data : [];
      return renderOrders(labels, data);
    }catch(_){ /* ignore */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('revenue-by');
    if(!sel) return;
    load(sel.value || 'month');
    sel.addEventListener('change', () => load(sel.value));

    const favSel = document.getElementById('category-days');
    const bestSel = document.getElementById('category-best-days');

    const reloadFavorite = () => {
      const days = favSel ? favSel.value : '0';
      loadFavorites(days);
    };
    const reloadBest = () => {
      const days = bestSel ? bestSel.value : '0';
      loadCategoryPie(days);
    };

    reloadFavorite();
    reloadBest();

    if (favSel) {
      favSel.addEventListener('change', reloadFavorite);
    }
    if (bestSel) {
      bestSel.addEventListener('change', reloadBest);
    }
    loadWeekly();

    // Highlights: Sắp hết hàng (biểu đồ số sản phẩm sắp hết theo thể loại)
    (async function(){
      try{
        const chartEl = document.getElementById('lowStockChart');
        if(!chartEl || typeof Chart === 'undefined') return;
        const res = await fetchJSON('/admin/stats/low-stock?limit=50');
        const rows = Array.isArray(res)? res: [];
        if(rows.length===0){
          return;
        }
        // Gom theo thể loại cho biểu đồ
        const agg = new Map();
        rows.forEach(r => {
          const cat = (r.category_name || 'Chưa phân loại');
          agg.set(cat, (agg.get(cat) || 0) + 1);
        });
        const categoryRows = Array.from(agg.entries()).sort((a,b)=> b[1]-a[1]);
        const labels = categoryRows.map(([name]) => name);
        const data = categoryRows.map(([,count]) => count);
        new Chart(chartEl, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Sản phẩm sắp hết', data, backgroundColor: 'rgba(255,99,132,0.7)' }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: { display: false },
            scales: { yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }] }
          }
        });
      }catch(_){
        // ignore
      }
    })();

    // Khách hàng mới: 12 tháng với 2 datasets (7 ngày gần & tổng tháng)
    (async function(){
      try{
        const canvas = document.getElementById('newCustomersChart');
        if(!canvas || typeof Chart === 'undefined') return;
        const res = await fetchJSON('/admin/customers/list');
        const rows = Array.isArray(res)? res: [];
        const now = new Date();
        const currentYear = now.getFullYear();
        
        const norm = v => {
          if(!v) return null;
          const d = new Date(v);
          return isNaN(d) ? null : d;
        };
        
        // Tính ngày 7 ngày trước
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        
        const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        const monthTotal = new Array(12).fill(0); // Tổng khách mỗi tháng
        const weekData = new Array(12).fill(0); // Khách 7 ngày gần đây của tháng hiện tại
        
        rows.forEach(c => {
          const d = norm(c.created_at || c.createdAt);
          if(!d || d.getFullYear() !== currentYear) return;
          
          const month = d.getMonth(); // 0-11
          monthTotal[month] += 1;
          
          // Nếu trong 7 ngày gần đây
          if(d >= sevenDaysAgo && d <= now) {
            weekData[now.getMonth()] += 1;
          }
        });
        
        new Chart(canvas, {
          type: 'bar',
          data: { 
            labels: monthNames, 
            datasets: [
              { 
                label: '7 ngày gần', 
                data: weekData, 
                backgroundColor: 'rgba(75,192,192,0.7)',
                borderColor: 'rgba(75,192,192,1)',
                borderWidth: 1
              },
              { 
                label: 'Tổng tháng', 
                data: monthTotal, 
                backgroundColor: 'rgba(54,162,235,0.7)',
                borderColor: 'rgba(54,162,235,1)',
                borderWidth: 1
              }
            ] 
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: { display: true, position: 'top' },
            scales: { 
              yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }],
              xAxes: [{ 
                barPercentage: 0.85,
                categoryPercentage: 0.9
              }]
            }
          }
        });
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

    // Biểu đồ đơn hàng gần đây giống biểu đồ doanh thu (line chart + bộ lọc)
    const ordersSel = document.getElementById('orders-by');
    if(ordersSel){
      loadOrders(ordersSel.value || 'month');
      ordersSel.addEventListener('change', () => loadOrders(ordersSel.value));
    } else {
      loadOrders('month');
    }
  });
})();
