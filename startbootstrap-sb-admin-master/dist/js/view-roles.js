(function(){
  window.AdminViews = window.AdminViews || {};
  window.AdminViews['roles'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">Phân quyền</h1>
      <div class="card mb-4">
        <div class="card-header d-flex align-items-center gap-2">
          <span><i class="fas fa-shield-alt me-1"></i> Quản lý quyền người dùng</span>
          <input id="r-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm email..."/>
          <button id="r-add" class="btn btn-sm btn-primary ms-auto"><i class="fas fa-user-plus"></i> Thêm</button>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>#</th><th>Email</th><th>Quyền</th><th>Ngày tạo</th></tr></thead>
            <tbody id="r-tbody"><tr><td colspan="4">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>`;

    // Modal tạo tài khoản
    const modalHtml = `
      <div class="modal fade" id="userModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Tạo tài khoản</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Email</label><input id="u-email" type="email" class="form-control" placeholder="user@example.com"/></div>
              <div class="mb-2"><label class="form-label">Mật khẩu</label><input id="u-password" type="password" class="form-control"/></div>
              <div class="mb-2"><label class="form-label">Quyền</label>
                <select id="u-role" class="form-select">
                  <option value="user" selected>user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
              <button id="u-save" type="button" class="btn btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', modalHtml);
    const tbody = container.querySelector('#r-tbody');
    const search = container.querySelector('#r-search');
    let list = [];
    const addBtn = container.querySelector('#r-add');
    const modalEl = container.querySelector('#userModal');
    const modal = new bootstrap.Modal(modalEl);
    const f = {
      email: () => container.querySelector('#u-email'),
      password: () => container.querySelector('#u-password'),
      role: () => container.querySelector('#u-role')
    };
    async function fetchJSON(url, opts){ const r = await fetch(url, Object.assign({ headers:{ 'Authorization':'Bearer '+token } }, opts||{})); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
    function roleSelect(u){
      const val = (u.role||'user').toLowerCase();
      return `<select class="form-select form-select-sm" data-act="role" data-id="${u.id}">
        <option value="user" ${val==='user'?'selected':''}>user</option>
        <option value="admin" ${val==='admin'?'selected':''}>admin</option>
      </select>`;
    }
    function fmtDate(s){ try{ return new Date(s).toLocaleString('vi-VN'); }catch(e){ return s||''; } }
    function render(){
      const q = (search.value||'').toLowerCase();
      const rows = list.filter(u=> !q || (u.email||'').toLowerCase().includes(q));
      tbody.innerHTML = rows.map((u,i)=>`<tr><td>${i+1}</td><td>${u.email||''}</td><td>${roleSelect(u)}</td><td>${fmtDate(u.created_at)}</td></tr>`).join('') || '<tr><td colspan="4">No data</td></tr>';
    }
    async function load(){ list = await fetchJSON('/admin/users'); render(); }
    async function createUser(){
      const body = { email: f.email().value.trim(), password: f.password().value, role: f.role().value };
      if(!body.email || !body.password){ alert('Vui lòng nhập email và mật khẩu'); return; }
      await fetchJSON('/admin/users', { method:'POST', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      modal.hide();
      f.email().value=''; f.password().value=''; f.role().value='user';
      await load();
    }
    tbody.addEventListener('change', async (e)=>{
      const sel = e.target.closest('select[data-act="role"]');
      if(!sel) return;
      const id = Number(sel.getAttribute('data-id'));
      const role = sel.value;
      try{ await fetchJSON('/admin/users/'+id+'/role', { method:'PATCH', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ role }) }); }
      catch(err){ alert('Cập nhật quyền thất bại'); }
    });
    search.addEventListener('input', render);
    addBtn.addEventListener('click', ()=> modal.show());
    container.querySelector('#u-save').addEventListener('click', ()=> createUser().catch(()=>alert('Tạo tài khoản thất bại')));
    try{ await load(); }catch(e){ tbody.innerHTML = '<tr><td colspan="4">Error loading</td></tr>'; }
  };
})();
