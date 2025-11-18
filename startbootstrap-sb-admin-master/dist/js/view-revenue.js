(function(){
  window.AdminViews = window.AdminViews || {};
  let chart, pie;
  function destroy(){ if(chart){ chart.destroy(); chart=null;} if(pie){ pie.destroy(); pie=null; } }
  window.AdminViews['revenue'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">Doanh thu</h1>
      <div class="row">
        <div class="col-xl-8">
          <div class="card mb-4">
            <div class="card-header d-flex align-items-center justify-content-between">
              <span><i class="fas fa-chart-line me-1"></i> Doanh thu</span>
              <select id="rev-by" class="form-select form-select-sm" style="max-width:140px">
                <option value="day">Theo ngày</option>
                <option value="month" selected>Theo tháng</option>
                <option value="year">Theo năm</option>
              </select>
            </div>
            <div class="card-body"><canvas id="revChart" height="60"></canvas></div>
          </div>
        </div>
        <div class="col-xl-4">
          <div class="card mb-4">
            <div class="card-header"><i class="fas fa-chart-pie me-1"></i> Sách bán chạy nhất</div>
            <div class="card-body"><canvas id="revPie" height="200"></canvas></div>
          </div>
        </div>
      </div>`;
    function renderLine(labels, data){
      const ctx = container.querySelector('#revChart');
      if(chart) chart.destroy();
      chart = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'Doanh thu', backgroundColor:'rgba(2,117,216,0.2)', borderColor:'rgba(2,117,216,1)', data }] } });
    }
    async function loadLine(by){
      const res = await fetch('/admin/charts/revenue?by='+encodeURIComponent(by), { headers:{ 'Authorization':'Bearer '+token } });
      const json = await res.json();
      renderLine(json.labels||[], json.data||[]);
    }
    async function loadPie(){
      const res = await fetch('/admin/top/best-sellers', { headers:{ 'Authorization':'Bearer '+token } });
      const json = await res.json();
      const labels = (json||[]).map(x=>x.name||x.product_name||('SP '+x.id));
      const data = (json||[]).map(x=> Number(x.sold||x.quantity||0));
      const ctx = container.querySelector('#revPie');
      if(pie) pie.destroy();
      pie = new Chart(ctx, { type:'pie', data:{ labels, datasets:[{ data, backgroundColor:['#0d6efd','#198754','#dc3545','#ffc107','#6f42c1','#20c997','#fd7e14','#0dcaf0'] }] } });
    }
    const sel = container.querySelector('#rev-by');
    sel.addEventListener('change', ()=> loadLine(sel.value));
    await loadLine(sel.value);
    await loadPie();
  };
})();
