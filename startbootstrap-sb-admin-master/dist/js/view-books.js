(function(){
  window.AdminViews = window.AdminViews || {};
  function fmtVND(n){ return (Number(n)||0).toLocaleString('vi-VN')+' ₫'; }
  window.AdminViews['books'] = async function mount(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">Sách</h1>
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center gap-2">
          <span><i class="fas fa-book me-1"></i> Danh sách sản phẩm</span>
          <div class="d-flex gap-2">
            <input id="books-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm tên sách..."/>
            <button id="btn-add" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i> Thêm</button>
          </div>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>#</th><th>Tên</th><th>Danh mục</th><th>NXB</th><th>Tác giả</th><th>Giá</th><th>Đã bán</th><th>Tồn</th><th style="width:140px">Hành động</th></tr></thead>
            <tbody id="books-tbody"><tr><td colspan="9">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="modal fade" id="bookModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Sản phẩm</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Tên</label><input id="f-name" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Giá</label><input id="f-price" type="number" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Danh mục</label><select id="f-category" class="form-select"></select></div>
              <div class="mb-2"><label class="form-label">NXB</label><select id="f-publisher" class="form-select"></select></div>
              <div class="mb-2"><label class="form-label">Tác giả (chính)</label><select id="f-author" class="form-select"></select></div>
              <div class="mb-2"><label class="form-label">Tồn kho</label><input id="f-stock" type="number" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Ảnh (URL)</label><input id="f-img" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Mô tả</label><textarea id="f-desc" class="form-control" rows="3"></textarea></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
              <button id="btn-save" type="button" class="btn btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      </div>`;

    let list = [];
    let categories = [];
    let publishers = [];
    let authors = [];
    let editingId = null;
    const tbody = container.querySelector('#books-tbody');
    const search = container.querySelector('#books-search');
    const btnAdd = container.querySelector('#btn-add');
    const modalEl = container.querySelector('#bookModal');
    const modal = new bootstrap.Modal(modalEl);
    const f = {
      name: () => container.querySelector('#f-name'),
      price: () => container.querySelector('#f-price'),
      stock: () => container.querySelector('#f-stock'),
      cat: () => container.querySelector('#f-category'),
      pub: () => container.querySelector('#f-publisher'),
      auth: () => container.querySelector('#f-author'),
      img: () => container.querySelector('#f-img'),
      desc: () => container.querySelector('#f-desc')
    };

    function clearForm(){ editingId = null; f.name().value=''; f.price().value=''; f.stock().value='0'; f.img().value=''; f.desc().value=''; }
    function fillForm(p){ editingId = p.id; f.name().value=p.name||''; f.price().value=p.price||0; f.stock().value=p.stock||0; f.img().value=p.img||''; f.desc().value=p.description||''; f.cat().value = p.category_id || ''; f.pub().value = p.publisher_id || ''; f.auth().value = p.author_id || ''; }

    function rowActions(p){
      return `
        <button class="btn btn-sm btn-outline-primary me-1" data-act="edit" data-id="${p.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${p.id}"><i class="fas fa-trash"></i></button>`;
    }

    function render(){
      const q = (search.value||'').toLowerCase();
      const rows = list.filter(p=>!q || (p.name||'').toLowerCase().includes(q));
      tbody.innerHTML = rows.map((p,i)=>`<tr><td>${i+1}</td><td>${p.name||''}</td><td>${p.category_name||''}</td><td>${p.publisher_name||''}</td><td>${p.author_name||''}</td><td>${fmtVND(p.price)}</td><td>${p.sold||0}</td><td>${p.stock||0}</td><td>${rowActions(p)}</td></tr>`).join('')||'<tr><td colspan="9">No data</td></tr>';
    }

    async function load(){
      const [pr, cr, pubr, ar] = await Promise.all([
        fetch('/admin/products', { headers: { 'Authorization': 'Bearer '+token, 'Content-Type':'application/json' } }),
        fetch('/admin/categories', { headers: { 'Authorization': 'Bearer '+token } }),
        fetch('/admin/parties?type=publisher', { headers: { 'Authorization': 'Bearer '+token } }),
        fetch('/admin/parties?type=author', { headers: { 'Authorization': 'Bearer '+token } })
      ]);
      if(!pr.ok) throw new Error('HTTP '+pr.status);
      if(!cr.ok) throw new Error('HTTP '+cr.status);
      if(!pubr.ok) throw new Error('HTTP '+pubr.status);
      if(!ar.ok) throw new Error('HTTP '+ar.status);
      list = await pr.json();
      categories = await cr.json();
      publishers = await pubr.json();
      authors = await ar.json();
      // fill category select
      f.cat().innerHTML = '<option value="">-- Không chọn --</option>' + categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
      f.pub().innerHTML = '<option value="">-- Không chọn --</option>' + publishers.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
      f.auth().innerHTML = '<option value="">-- Không chọn --</option>' + authors.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
      render();
    }

    async function save(){
      const body = { name: f.name().value.trim(), price: Number(f.price().value||0), stock: Number(f.stock().value||0), img: f.img().value.trim(), description: f.desc().value.trim(), category_id: f.cat().value ? Number(f.cat().value) : null, publisher_id: f.pub().value ? Number(f.pub().value) : null, author_id: f.auth().value ? Number(f.auth().value) : null };
      const opts = { method: editingId? 'PUT':'POST', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) };
      const url = editingId? ('/admin/products/'+editingId): '/admin/products';
      const res = await fetch(url, opts);
      if(!res.ok) throw new Error('HTTP '+res.status);
      modal.hide();
      await load();
    }

    async function remove(id){
      if(!confirm('Xóa sản phẩm này?')) return;
      const res = await fetch('/admin/products/'+id, { method:'DELETE', headers:{ 'Authorization':'Bearer '+token } });
      if(!res.ok) throw new Error('HTTP '+res.status);
      await load();
    }

    tbody.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]');
      if(!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      const p = list.find(x=>x.id===id);
      if(btn.getAttribute('data-act')==='edit' && p){ fillForm(p); modal.show(); }
      if(btn.getAttribute('data-act')==='del'){ remove(id).catch(()=>alert('Xóa thất bại')); }
    });

    btnAdd.addEventListener('click', ()=>{ clearForm(); modal.show(); });
    container.querySelector('#btn-save').addEventListener('click', ()=> save().catch(()=>alert('Lưu thất bại')));
    search.addEventListener('input', render);

    try { await load(); } catch(e){ tbody.innerHTML = '<tr><td colspan="6">Error loading</td></tr>'; }
  }
})();
