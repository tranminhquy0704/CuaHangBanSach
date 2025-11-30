(function(){
  window.AdminViews = window.AdminViews || {};
  
  function fmtDate(s){ 
    try{ return new Date(s).toLocaleString('vi-VN'); }
    catch(e){ return s||''; } 
  }
  
  function getStatusBadge(status){
    const badges = {
      new: '<span class="badge bg-danger">Mới</span>',
      read: '<span class="badge bg-warning text-dark">Đã đọc</span>',
      replied: '<span class="badge bg-success">Đã trả lời</span>'
    };
    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
  }

  window.AdminViews['contacts'] = async function mount(container){
    const token = localStorage.getItem('token');
    let currentFilter = '';
    let allContacts = [];

    container.innerHTML = `
      <h1 class="mt-4">Quản lý liên hệ</h1>

      <!-- Statistics Cards -->
      <div class="row g-3 mb-4">
        <div class="col-xl-3 col-md-6">
          <div class="card mb-0 border-0 shadow-sm bg-primary text-white" style="border-radius:10px;">
            <div class="card-body py-3">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small opacity-75 mb-1">Tổng số</div>
                  <div class="h5 fw-bold mb-0" id="totalCount">0</div>
                </div>
                <div><i class="fas fa-envelope fa-2x opacity-50"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6">
          <div class="card mb-0 border shadow-sm" style="border-radius:10px;">
            <div class="card-body py-3">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small text-danger fw-bold mb-1">Tin mới</div>
                  <div class="h5 fw-bold mb-0" id="newCount">0</div>
                </div>
                <div><i class="fas fa-exclamation-circle fa-2x text-danger"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6">
          <div class="card mb-0 border shadow-sm" style="border-radius:10px;">
            <div class="card-body py-3">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small text-warning fw-bold mb-1">Đã đọc</div>
                  <div class="h5 fw-bold mb-0" id="readCount">0</div>
                </div>
                <div><i class="fas fa-check-circle fa-2x text-warning"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6">
          <div class="card mb-0 border shadow-sm" style="border-radius:10px;">
            <div class="card-body py-3">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small text-success fw-bold mb-1">Đã trả lời</div>
                  <div class="h5 fw-bold mb-0" id="repliedCount">0</div>
                </div>
                <div><i class="fas fa-reply fa-2x text-success"></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter and Table -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="fas fa-list me-1"></i> Danh sách liên hệ</span>
          <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-outline-primary" data-filter="">Tất cả</button>
            <button type="button" class="btn btn-outline-danger" data-filter="new">Mới</button>
            <button type="button" class="btn btn-outline-warning" data-filter="read">Đã đọc</button>
            <button type="button" class="btn btn-outline-success" data-filter="replied">Đã trả lời</button>
          </div>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên</th>
                <th>Email</th>
                <th>Tiêu đề</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th style="width:120px">Hành động</th>
              </tr>
            </thead>
            <tbody id="contactsTableBody">
              <tr><td colspan="7" class="text-center">Đang tải...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Modal -->
      <div id="contactDetail"></div>
    `;

    // Load stats
    async function loadStats(){
      try {
        const resp = await fetch('/admin/contacts/stats', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const stats = await resp.json();
        container.querySelector('#totalCount').textContent = stats.total || 0;
        container.querySelector('#newCount').textContent = stats.new_count || 0;
        container.querySelector('#readCount').textContent = stats.read_count || 0;
        container.querySelector('#repliedCount').textContent = stats.replied_count || 0;
      } catch(err){
        console.error('Error loading stats:', err);
      }
    }

    // Load contacts
    async function loadContacts(){
      try {
        const url = currentFilter ? `/admin/contacts?status=${currentFilter}` : '/admin/contacts';
        const resp = await fetch(url, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        allContacts = await resp.json();
        renderTable();
      } catch(err){
        console.error('Error loading contacts:', err);
        container.querySelector('#contactsTableBody').innerHTML = 
          '<tr><td colspan="7" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
      }
    }

    // Render table
    function renderTable(){
      const tbody = container.querySelector('#contactsTableBody');
      if(!allContacts || allContacts.length === 0){
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không có liên hệ nào</td></tr>';
        return;
      }

      tbody.innerHTML = allContacts.map((c, i) => `
        <tr class="${c.status === 'new' ? 'table-warning' : ''}">
          <td>${i + 1}</td>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.email)}</td>
          <td>${escapeHtml(c.subject)}</td>
          <td>${getStatusBadge(c.status)}</td>
          <td>${fmtDate(c.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-outline-info" data-act="view" data-id="${c.id}">Xem</button>
          </td>
        </tr>
      `).join('');
    }

    // View detail
    async function viewDetail(id){
      const contact = allContacts.find(c => c.id === id);
      if(!contact) return;

      // Mark as read if new
      if(contact.status === 'new'){
        await updateStatus(id, 'read');
        contact.status = 'read';
      }

      const detailDiv = container.querySelector('#contactDetail');
      detailDiv.innerHTML = `
        <div class="card mb-4">
          <div class="card-header">
            <i class="fas fa-envelope-open me-1"></i> Chi tiết liên hệ #${id}
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>Tên:</strong> ${escapeHtml(contact.name)}
              </div>
              <div class="col-md-6">
                <strong>Email:</strong> ${escapeHtml(contact.email)}
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>Trạng thái:</strong> ${getStatusBadge(contact.status)}
              </div>
              <div class="col-md-6">
                <strong>Thời gian:</strong> ${fmtDate(contact.created_at)}
              </div>
            </div>
            <div class="mb-3">
              <strong>Tiêu đề:</strong>
              <p class="mt-2">${escapeHtml(contact.subject)}</p>
            </div>
            <div class="mb-3">
              <strong>Nội dung:</strong>
              <div class="mt-2 p-3 bg-light rounded">${escapeHtml(contact.message)}</div>
            </div>
            <hr>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-warning btn-sm" data-act="mark-read" data-id="${id}" ${contact.status === 'read' || contact.status === 'replied' ? 'disabled' : ''}>
                <i class="fas fa-check me-1"></i> Đánh dấu đã đọc
              </button>
              <button class="btn btn-success btn-sm" data-act="mark-replied" data-id="${id}" ${contact.status === 'replied' ? 'disabled' : ''}>
                <i class="fas fa-reply me-1"></i> Đánh dấu đã trả lời
              </button>
              <button class="btn btn-danger btn-sm" data-act="delete" data-id="${id}">
                <i class="fas fa-trash me-1"></i> Xóa
              </button>
              <button class="btn btn-secondary btn-sm" data-act="close">
                <i class="fas fa-times me-1"></i> Đóng
              </button>
            </div>
          </div>
        </div>
      `;

      detailDiv.scrollIntoView({ behavior: 'smooth' });
    }

    // Update status
    async function updateStatus(id, status){
      try {
        await fetch(`/admin/contacts/${id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ status })
        });
        await loadStats();
        await loadContacts();
      } catch(err){
        console.error('Error updating status:', err);
        alert('Lỗi khi cập nhật trạng thái');
      }
    }

    // Delete contact
    async function deleteContact(id){
      if(!confirm('Bạn có chắc chắn muốn xóa liên hệ này?')) return;
      try {
        await fetch(`/admin/contacts/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        container.querySelector('#contactDetail').innerHTML = '';
        await loadStats();
        await loadContacts();
      } catch(err){
        console.error('Error deleting contact:', err);
        alert('Lỗi khi xóa liên hệ');
      }
    }

    // Event listeners
    container.querySelector('.btn-group').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if(!btn) return;
      
      // Update active state
      container.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentFilter = btn.getAttribute('data-filter');
      loadContacts();
    });

    container.querySelector('#contactsTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act="view"]');
      if(!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      viewDetail(id);
    });

    container.querySelector('#contactDetail').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if(!btn) return;
      
      const act = btn.getAttribute('data-act');
      const id = Number(btn.getAttribute('data-id'));
      
      if(act === 'close'){
        container.querySelector('#contactDetail').innerHTML = '';
      } else if(act === 'mark-read'){
        await updateStatus(id, 'read');
        viewDetail(id);
      } else if(act === 'mark-replied'){
        await updateStatus(id, 'replied');
        viewDetail(id);
      } else if(act === 'delete'){
        await deleteContact(id);
      }
    });

    function escapeHtml(text){
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initial load
    await loadStats();
    await loadContacts();
    
    // Set first button as active
    container.querySelector('.btn-group button').classList.add('active');
  };
})();

