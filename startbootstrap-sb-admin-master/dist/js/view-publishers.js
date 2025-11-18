(function(){
  window.AdminViews = window.AdminViews || {};
  window.AdminViews['publishers'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">NXB / Tác giả</h1>
      <div class="card mb-4">
        <div class="card-header d-flex align-items-center gap-2">
          <span><i class="fas fa-building me-1"></i> Quản lý NXB/Tác giả</span>
          <select id="party-type" class="form-select form-select-sm" style="max-width:180px">
            <option value="">Tất cả</option>
            <option value="publisher">NXB</option>
            <option value="author">Tác giả</option>
          </select>
          <input id="party-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm theo tên..."/>
          <button id="party-add" class="btn btn-sm btn-primary ms-auto"><i class="fas fa-plus"></i> Thêm</button>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>#</th><th>Tên</th><th>Loại</th><th>Mô tả</th><th>Ngày tạo</th><th style="width:140px">Hành động</th></tr></thead>
            <tbody id="party-tbody"><tr><td colspan="6">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal fade" id="partyModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">NXB / Tác giả</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Tên</label><input id="pt-name" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Loại</label>
                <select id="pt-type" class="form-select">
                  <option value="publisher">NXB</option>
                  <option value="author">Tác giả</option>
                </select>
              </div>
              <div class="mb-2"><label class="form-label">Mô tả</label><textarea id="pt-desc" class="form-control" rows="3"></textarea></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
              <button id="pt-save" type="button" class="btn btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let list = [];
    let editingId = null;
    const tbody = container.querySelector('#party-tbody');
    const search = container.querySelector('#party-search');
    const typeSel = container.querySelector('#party-type');
    const btnAdd = container.querySelector('#party-add');
    const modal = new bootstrap.Modal(container.querySelector('#partyModal'));
    const f = { name:()=>container.querySelector('#pt-name'), type:()=>container.querySelector('#pt-type'), desc:()=>container.querySelector('#pt-desc') };
    function fmtDate(s){ try{ return new Date(s).toLocaleString('vi-VN'); }catch(e){ return s||''; } }
    function clearForm(){ editingId=null; f.name().value=''; f.type().value='publisher'; f.desc().value=''; }
    function fillForm(p){ editingId=p.id; f.name().value=p.name||''; f.type().value=p.type||'publisher'; f.desc().value=p.description||''; }
    function actions(p){
      return `<button class="btn btn-sm btn-outline-primary me-1" data-act="edit" data-id="${p.id}"><i class=\"fas fa-edit\"></i></button>
              <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${p.id}"><i class=\"fas fa-trash\"></i></button>`;
    }
    function render(){
      const q = (search.value||'').toLowerCase(); const t = typeSel.value||'';
      const rows = list.filter(p => (!q || (p.name||'').toLowerCase().includes(q)) && (!t || (p.type||'')===t));
      tbody.innerHTML = rows.map((p,i)=>`<tr><td>${i+1}</td><td>${p.name||''}</td><td>${p.type||''}</td><td>${p.description||''}</td><td>${fmtDate(p.created_at)}</td><td>${actions(p)}</td></tr>`).join('') || '<tr><td colspan="6">No data</td></tr>';
    }
    async function fetchJSON(url, opts){ const r = await fetch(url, Object.assign({ headers:{ 'Authorization':'Bearer '+token } }, opts||{})); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
    async function load(){ list = await fetchJSON('/admin/parties'+(typeSel.value?('?type='+encodeURIComponent(typeSel.value)):'') ); render(); }
    async function save(){
      const body = { name: f.name().value.trim(), type: f.type().value, description: f.desc().value.trim() };
      if(!body.name) return alert('Tên là bắt buộc');
      const url = editingId? ('/admin/parties/'+editingId) : '/admin/parties';
      const method = editingId? 'PUT' : 'POST';
      await fetchJSON(url, { method, headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      modal.hide();
      await load();
    }
    async function remove(id){ if(!confirm('Xóa mục này?')) return; await fetchJSON('/admin/parties/'+id, { method:'DELETE' }); await load(); }
    tbody.addEventListener('click', (e)=>{ const btn=e.target.closest('button[data-act]'); if(!btn) return; const id=Number(btn.getAttribute('data-id')); const it=list.find(x=>x.id===id); if(btn.getAttribute('data-act')==='edit'&&it){ fillForm(it); modal.show(); } if(btn.getAttribute('data-act')==='del'){ remove(id).catch(()=>alert('Xóa thất bại')); } });
    btnAdd.addEventListener('click', ()=>{ clearForm(); modal.show(); });
    container.querySelector('#pt-save').addEventListener('click', ()=> save().catch(()=>alert('Lưu thất bại')));
    search.addEventListener('input', render); typeSel.addEventListener('change', ()=> load().catch(()=>{}));
    try { await load(); } catch(e){ tbody.innerHTML = '<tr><td colspan="6">Error loading (chưa có API /admin/parties)</td></tr>'; }
  };
})();
