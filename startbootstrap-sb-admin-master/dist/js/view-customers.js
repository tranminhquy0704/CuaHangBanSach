(function(){
  window.AdminViews = window.AdminViews || {};
  function fmtVND(n){ return (Number(n)||0).toLocaleString('vi-VN')+' ₫'; }
  function fmtDate(s){ try{ return new Date(s).toLocaleString('vi-VN'); }catch(e){ return s||''; } }
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
  
  window.AdminViews['customers'] = async function mount(container){
    const token = localStorage.getItem('token');
    let currentCustomerId = null;
    
    container.innerHTML = `
      <h1 class="mt-4">Khách hàng</h1>
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="fas fa-users me-1"></i> Danh sách khách hàng</span>
          <input id="cus-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm email..."/>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>#</th><th>Email</th><th>Ngày tạo</th><th>Trạng thái</th><th style="width:280px">Hành động</th></tr></thead>
            <tbody id="cus-tbody"><tr><td colspan="5">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
      <div id="cus-detail"></div>`;
    
    try{
      const res = await fetch('/admin/customers/list', { headers: { 'Authorization': 'Bearer '+token } });
      if(!res.ok) throw new Error('HTTP '+res.status);
      let list = await res.json();
      if(!Array.isArray(list)) list = [];
      
      // Load all orders untuk matching
      let allOrders = [];
      try{
        const ordersRes = await fetch('/admin/orders/recent?limit=500', { headers: { 'Authorization': 'Bearer '+token } });
        if(ordersRes.ok){
          const ordersData = await ordersRes.json();
          allOrders = Array.isArray(ordersData) ? ordersData : [];
        }
      }catch(e){
        console.warn('Failed to load orders:', e);
      }
      
      const tbody = container.querySelector('#cus-tbody');
      const search = container.querySelector('#cus-search');
      const detail = container.querySelector('#cus-detail');
      
      function render(){
        const q = (search.value||'').toLowerCase();
        const rows = list.filter(u=>!q || (u.email||'').toLowerCase().includes(q));
        tbody.innerHTML = rows.map((u,i)=>{
          const isBlocked = String(u.status||'')==='blocked';
          const actions = `
            <button class="btn btn-sm btn-outline-info me-1" data-act="view" data-id="${u.id}">Xem</button>
            ${isBlocked?
              `<button class="btn btn-sm btn-outline-success me-1" data-act="unblock" data-id="${u.id}">Mở khóa</button>`:
              `<button class="btn btn-sm btn-outline-warning me-1" data-act="block" data-id="${u.id}">Khóa</button>`}
            <button class="btn btn-sm btn-outline-danger" data-act="reset" data-id="${u.id}">Reset mật khẩu</button>`;
          return `<tr><td>${i+1}</td><td>${u.email||''}</td><td>${fmtDate(u.created_at)}</td><td><span class="badge ${isBlocked?'bg-danger':'bg-success'}">${u.status||'active'}</span></td><td>${actions}</td></tr>`;
        }).join('')||'<tr><td colspan="5" class="text-center text-muted">Không có dữ liệu</td></tr>';
      }
      
      search.addEventListener('input', render);
      
      tbody.addEventListener('click', async (e)=>{
        const btn = e.target.closest('button[data-act]');
        if(!btn) return;
        
        const id = Number(btn.getAttribute('data-id'));
        const act = btn.getAttribute('data-act');
        
        try{
          if(act==='view'){
            currentCustomerId = id;
            detail.innerHTML = '<div class="card"><div class="card-body text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div></div>';
            
            try{
              // Lấy chi tiết khách hàng (cơ bản + đơn hàng đã gán)
              const r = await fetch(`/admin/customers/${id}/detail`, { headers:{ 'Authorization':'Bearer '+token } });
              if(!r.ok) throw new Error(`HTTP ${r.status}`);
              
              const d = await r.json();
              const user = d.user || {};
              // Backend đã filter đúng user_id rồi, không cần filter lại
              let orders = d.orders || [];
              
              const ordersHtml = orders.map(o=>{
                // Hiển thị sản phẩm trong đơn hàng
                let itemsHtml = '';
                // Đảm bảo cartItems là array
                let cartItems = o.cartItems;
                
                // Debug: log để kiểm tra
                console.log('Order', o.id, 'cartItems:', cartItems, 'Type:', typeof cartItems);
                
                if (typeof cartItems === 'string') {
                  try {
                    cartItems = JSON.parse(cartItems);
                    console.log('After parse:', cartItems, 'Length:', cartItems?.length);
                  } catch (e) {
                    console.error('Error parsing cartItems for order', o.id, ':', e);
                    cartItems = [];
                  }
                }
                
                // Đảm bảo cartItems là array
                if (!Array.isArray(cartItems)) {
                  console.warn('cartItems is not an array for order', o.id, ':', cartItems);
                  cartItems = [];
                }
                
                if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
                  console.log('Rendering', cartItems.length, 'items for order', o.id);
                  // Đảm bảo render tất cả items trong array
                  itemsHtml = cartItems.map((item, idx) => {
                    // Kiểm tra và parse item nếu cần
                    if (typeof item === 'string') {
                      try {
                        item = JSON.parse(item);
                      } catch (e) {
                        console.error('Error parsing item', idx, ':', e);
                        item = {};
                      }
                    }
                    const itemName = item.name || item.productName || 'N/A';
                    const itemQty = parseInt(item.quantity || 1);
                    // Parse VND price correctly - handles formats like "123.00" (meaning 123000 VND)
                    function parseVND(val) {
                      if (val === null || val === undefined) return 0;
                      const raw = String(val).trim();
                      const decMatch = raw.match(/^(\d{1,3})[\.,](\d{2})$/);
                      if (decMatch) {
                        const i = parseInt(decMatch[1], 10);
                        return i * 1000;
                      }
                      const digits = raw.replace(/\D/g, '');
                      if (!digits) return 0;
                      return parseInt(digits, 10);
                    }
                    const itemPrice = parseVND(item.price || 0);
                    const itemTotal = itemPrice * itemQty;
                    console.log(`Item ${idx}:`, itemName, 'Qty:', itemQty, 'Price:', itemPrice);
                    return `<div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                      <div>
                        <strong>${itemName}</strong>
                        <div class="small text-muted">Số lượng: ${itemQty} x ${fmtVND(itemPrice)}</div>
                      </div>
                      <div class="text-end">
                        <strong>${fmtVND(itemTotal)}</strong>
                      </div>
                    </div>`;
                  }).join('');
                  console.log('Generated itemsHtml length:', itemsHtml.length);
                } else {
                  const debugInfo = cartItems ? ` (Type: ${typeof cartItems}, Length: ${Array.isArray(cartItems) ? cartItems.length : 'N/A'})` : ' (null/undefined)';
                  itemsHtml = `<div class="small text-muted">Không có sản phẩm${debugInfo}</div>`;
                  console.warn('No items found for order', o.id, debugInfo);
                }
                return `<tr>
                  <td>${o.id}</td>
                  <td>${o.fullName||''}</td>
                  <td>${fmtDate(o.created_at)}</td>
                  <td>${fmtVND(o.total)}</td>
                  <td>${fmtStatus(o.status)}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-info" type="button" data-bs-toggle="collapse" data-bs-target="#order-items-${o.id}" aria-expanded="false" aria-controls="order-items-${o.id}">
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
                <tr class="collapse" id="order-items-${o.id}" data-bs-parent="#orders-accordion">
                  <td colspan="6" class="bg-light">
                    <div class="p-3">
                      <h6 class="mb-3"><i class="fas fa-box me-2"></i>Sản phẩm trong đơn hàng #${o.id}:</h6>
                      <div class="ms-3">
                        ${itemsHtml}
                      </div>
                    </div>
                  </td>
                </tr>`;
              }).join('') || '<tr><td colspan="6" class="text-center text-muted">Không có đơn hàng</td></tr>';
              
              detail.innerHTML = `
                <div class="card mt-4">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-user me-2"></i>Chi tiết khách hàng</span>
                    <span>${user.email||''}</span>
                  </div>
                  <div class="card-body">
                    <div class="row mb-3">
                      <div class="col-md-6">
                        <div class="mb-2"><strong>Email:</strong> ${user.email||'N/A'}</div>
                        <div class="mb-2"><strong>Trạng thái:</strong> <span class="badge ${user.status==='blocked'?'bg-danger':'bg-success'}">${user.status||'active'}</span></div>
                        <div class="mb-2"><strong>Ngày tạo:</strong> ${fmtDate(user.created_at)}</div>
                      </div>
                      <div class="col-md-6">
                        <div class="mb-0">
                          <strong>Tổng chi tiêu:</strong> ${fmtVND(d.totalSpent||0)}
                        </div>
                      </div>
                    </div>
                    
                  <h5 class="mt-4 mb-3"><i class="fas fa-shopping-cart me-2"></i>Đơn hàng của khách hàng</h5>
                  <div class="table-responsive">
                      <div id="orders-accordion">
                        <table class="table table-sm table-bordered table-hover">
                          <thead class="table-light"><tr><th>ID</th><th>Khách</th><th>Ngày</th><th>Tổng</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                          <tbody>${ordersHtml}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>`;
            }catch(viewErr){
              detail.innerHTML = `<div class="alert alert-danger mt-4">
                <strong>Lỗi:</strong> ${viewErr.message||'Không thể tải chi tiết khách hàng'}
              </div>`;
            }
            return;
          }
          
          if(act==='block' || act==='unblock'){
            const status = act==='block' ? 'blocked' : 'active';
            const r = await fetch(`/admin/users/${id}/status`, { method:'PATCH', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ status }) });
            if(!r.ok) throw new Error('HTTP '+r.status);
            const idx = list.findIndex(x=>x.id===id);
            if(idx>=0) list[idx].status = status;
            render();
            return;
          }
          
          if(act==='attach'){
            const orderId = Number(btn.getAttribute('data-order-id'));
            if (!orderId) return;
            const r = await fetch(`/admin/orders/${orderId}/attach-user`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) });
            if(!r.ok) throw new Error('Gán đơn hàng thất bại');
            // Tải lại chi tiết khách hàng
            if(currentCustomerId === id){
              const viewBtn = tbody.querySelector(`button[data-act="view"][data-id="${id}"]`);
              if(viewBtn) viewBtn.click();
            }
            return;
          }
          
          if(act==='reset'){
            if(!confirm('Xác nhận reset mật khẩu cho tài khoản này?')) return;
            const r = await fetch(`/admin/users/${id}/reset-password`, { method:'POST', headers:{ 'Authorization':'Bearer '+token } });
            if(!r.ok) throw new Error('HTTP '+r.status);
            const data = await r.json();
            alert('Mật khẩu tạm thời: '+ (data.tempPassword||''));
            return;
          }
        }catch(err){
          console.error('[admin] customer action error', err);
          detail.innerHTML = `<div class="alert alert-danger mt-4">
            <strong>Lỗi:</strong> ${err.message||'Có lỗi xảy ra'}
          </div>`;
        }
      });
      
      render();
    }catch(e){
      console.error('Load customers error:', e);
      container.querySelector('#cus-tbody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
    }
  }
})();
