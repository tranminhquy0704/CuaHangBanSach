(function(){
  window.AdminViews = window.AdminViews || {};
  window.AdminViews['categories'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">Thể loại</h1>
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center gap-2">
          <span><i class="fas fa-tags me-1"></i> Quản lý thể loại</span>
          <div class="d-flex gap-2">
            <input id="c-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm thể loại..."/>
            <button id="c-add" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i> Thêm</button>
          </div>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>#</th><th>Tên</th><th>Mô tả</th><th>Ngày tạo</th><th style="width:140px">Hành động</th></tr></thead>
            <tbody id="c-tbody"><tr><td colspan="5">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal fade" id="catModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Thể loại</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Tên</label><input id="cat-name" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Mô tả</label><textarea id="cat-desc" class="form-control" rows="3"></textarea></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
              <button id="cat-save" type="button" class="btn btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let list = [];
    let editingId = null;
    const tbody = container.querySelector('#c-tbody');
    const search = container.querySelector('#c-search');
    const btnAdd = container.querySelector('#c-add');
    const modal = new bootstrap.Modal(container.querySelector('#catModal'));
    const f = { name: ()=>container.querySelector('#cat-name'), desc: ()=>container.querySelector('#cat-desc') };

    function fmtDate(s){ try{ return new Date(s).toLocaleString('vi-VN'); }catch(e){ return s||''; } }
    function clearForm(){ editingId=null; f.name().value=''; f.desc().value=''; }
    function fillForm(c){ editingId=c.id; f.name().value=c.name||''; f.desc().value=c.description||''; }

    function rowActions(c){
      return `<button class="btn btn-sm btn-outline-primary me-1" data-act="edit" data-id="${c.id}"><i class=\"fas fa-edit\"></i></button>
              <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${c.id}"><i class=\"fas fa-trash\"></i></button>`;
    }

    function render(){
      const q = (search.value||'').toLowerCase();
      const rows = list.filter(c=>!q || (c.name||'').toLowerCase().includes(q));
      tbody.innerHTML = rows.map((c,i)=>`<tr><td>${i+1}</td><td>${c.name||''}</td><td>${c.description||''}</td><td>${fmtDate(c.created_at)}</td><td>${rowActions(c)}</td></tr>`).join('') || '<tr><td colspan="5">No data</td></tr>';
    }

    async function load(){
      const res = await fetch('/admin/categories', { headers:{ 'Authorization':'Bearer '+token } });
      if(!res.ok) throw new Error('HTTP '+res.status);
      list = await res.json();
      render();
    }

    async function save(){
      const body = { name: f.name().value.trim(), description: f.desc().value.trim() };
      if(!body.name) { alert('Tên là bắt buộc'); return; }
      const url = editingId? ('/admin/categories/'+editingId) : '/admin/categories';
      const method = editingId? 'PUT':'POST';
      const res = await fetch(url, { method, headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      if(!res.ok) throw new Error('HTTP '+res.status);
      modal.hide();
      await load();
    }

    async function remove(id){
      if(!confirm('Xóa thể loại này?')) return;
      const res = await fetch('/admin/categories/'+id, { method:'DELETE', headers:{ 'Authorization':'Bearer '+token } });
      if(!res.ok) throw new Error('HTTP '+res.status);
      await load();
    }

    tbody.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]');
      if(!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      const cat = list.find(x=>x.id===id);
      if(btn.getAttribute('data-act')==='edit' && cat){ fillForm(cat); modal.show(); }
      if(btn.getAttribute('data-act')==='del'){ remove(id).catch(()=>alert('Xóa thất bại')); }
    });

    btnAdd.addEventListener('click', ()=>{ clearForm(); modal.show(); });
    container.querySelector('#cat-save').addEventListener('click', ()=> save().catch(()=>alert('Lưu thất bại')));
    search.addEventListener('input', render);

    try{ await load(); }catch(e){ tbody.innerHTML = '<tr><td colspan="5">Error loading</td></tr>'; }
  };
})();
