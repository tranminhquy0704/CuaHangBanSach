(function(){
  window.AdminViews = window.AdminViews || {};
  function fmtVND(n){ return (Number(n)||0).toLocaleString('vi-VN')+' ₫'; }
  window.AdminViews['inventory'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">Kho hàng</h1>
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center gap-2">
          <span><i class="fas fa-warehouse me-1"></i> Điều chỉnh tồn kho</span>
          <input id="inv-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm tên sách..."/>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>#</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Tồn hiện tại</th><th style="width:260px">Điều chỉnh</th></tr></thead>
            <tbody id="inv-tbody"><tr><td colspan="6">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>`;
    let list = [];
    const tbody = container.querySelector('#inv-tbody');
    const search = container.querySelector('#inv-search');
    try{
      const res = await fetch('/admin/products', { headers:{ 'Authorization':'Bearer '+token }});
      if(!res.ok) throw new Error('HTTP '+res.status);
      list = await res.json();
      function controls(p){
        return `
          <div class="d-flex align-items-center gap-2">
            <input type="number" class="form-control form-control-sm" style="max-width:100px" min="0" value="${p.stock||0}" data-act="new" data-id="${p.id}">
            <button class="btn btn-sm btn-outline-primary" data-act="set" data-id="${p.id}">Set</button>
            <input type="number" class="form-control form-control-sm" style="max-width:90px" value="1" data-act="delta" data-id="${p.id}">
            <button class="btn btn-sm btn-outline-success" data-act="plus" data-id="${p.id}">+ Add</button>
            <button class="btn btn-sm btn-outline-danger" data-act="minus" data-id="${p.id}">- Sub</button>
          </div>`;
      }
      function render(){
        const q = (search.value||'').toLowerCase();
        const rows = list.filter(p=>!q || (p.name||'').toLowerCase().includes(q));
        tbody.innerHTML = rows.map((p,i)=>`<tr>
          <td>${i+1}</td><td>${p.name||''}</td><td>${p.category_name||''}</td><td>${fmtVND(p.price)}</td><td><span data-role="stock" data-id="${p.id}">${p.stock||0}</span></td><td>${controls(p)}</td>
        </tr>`).join('')||'<tr><td colspan="6">No data</td></tr>';
      }
      async function patch(id, body){
        const r = await fetch('/admin/products/'+id+'/stock', { method:'PATCH', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      }
      tbody.addEventListener('click', async (e)=>{
        const btn = e.target.closest('button[data-act]');
        if(!btn) return;
        const id = Number(btn.getAttribute('data-id'));
        const row = btn.closest('tr');
        const newInput = row.querySelector('input[data-act="new"][data-id="'+id+'"]');
        const deltaInput = row.querySelector('input[data-act="delta"][data-id="'+id+'"]');
        try{
          if(btn.getAttribute('data-act')==='set'){
            const val = Number(newInput.value||0);
            const { stock } = await patch(id, { newStock: val });
            row.querySelector('[data-role="stock"][data-id="'+id+'"]').textContent = stock;
          } else if(btn.getAttribute('data-act')==='plus'){
            const d = Math.abs(Number(deltaInput.value||1));
            const { stock } = await patch(id, { delta: d });
            row.querySelector('[data-role="stock"][data-id="'+id+'"]').textContent = stock;
            newInput.value = stock;
          } else if(btn.getAttribute('data-act')==='minus'){
            const d = -Math.abs(Number(deltaInput.value||1));
            const { stock } = await patch(id, { delta: d });
            row.querySelector('[data-role="stock"][data-id="'+id+'"]').textContent = stock;
            newInput.value = stock;
          }
        }catch(err){ alert('Cập nhật tồn kho thất bại'); }
      });
      search.addEventListener('input', render);
      render();
    }catch(e){
      tbody.innerHTML = '<tr><td colspan="6">Error loading</td></tr>';
    }
  };
})();
