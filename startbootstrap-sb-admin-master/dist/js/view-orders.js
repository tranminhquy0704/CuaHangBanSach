(function(){
  window.AdminViews = window.AdminViews || {};
  function fmtVND(n){ return (Number(n)||0).toLocaleString('vi-VN')+'\u00A0₫'; }
  function fmtDate(s){ try{ return new Date(s).toLocaleString('vi-VN'); }catch(e){ return s||''; } }
  // Parse VND price - handles formats like "123.00" (meaning 123000 VND) or "123000"
  function parseVND(val) {
    if (val === null || val === undefined) return 0;
    const raw = String(val).trim();
    // patterns like "123.00" or "123,00" often mean 123k in scraped data
    const decMatch = raw.match(/^(\d{1,3})[\.,](\d{2})$/);
    if (decMatch) {
      const i = parseInt(decMatch[1], 10);
      return i * 1000;
    }
    // remove all non-digits
    const digits = raw.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits, 10);
  }
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
  window.AdminViews['orders'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <h1 class="mt-4">Đơn hàng</h1>
      <div class="card mb-4">
        <div class="card-header d-flex flex-wrap gap-2 align-items-center">
          <span><i class="fas fa-shopping-cart me-1"></i> Danh sách đơn hàng</span>
          <input id="o-search" class="form-control form-control-sm" style="max-width:200px" placeholder="Tìm theo khách..."/>
          <select id="o-status" class="form-select form-select-sm" style="max-width:160px">
            <option value="">Tất cả trạng thái</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="shipped">shipped</option>
            <option value="completed">completed</option>
            <option value="canceled">canceled</option>
          </select>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead><tr><th>ID</th><th>Khách</th><th>Ngày</th><th>Tổng</th><th>Trạng thái</th><th style="width:280px">Hành động</th></tr></thead>
            <tbody id="o-tbody"><tr><td colspan="6">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal for order detail -->
      <div class="modal fade" id="orderDetailModal" tabindex="-1" aria-labelledby="orderDetailModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="orderDetailModalLabel">Chi tiết đơn hàng #<span id="modal-order-id"></span></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="order-detail-content">
              <div class="text-center py-4">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Đang tải...</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>`;
    try{
      const res = await fetch('/admin/orders/recent?limit=200', { headers: { 'Authorization': 'Bearer '+token } });
      const data = await res.json();
      let list = Array.isArray(data)?data:[];
      const tbody = container.querySelector('#o-tbody');
      const search = container.querySelector('#o-search');
      const statusSel = container.querySelector('#o-status');
      const actions = (o)=>{
        const s = String(o.status||'').toLowerCase();
        const btn = (label, st, cls) => `<button class="btn btn-sm ${cls} me-1" data-act="status" data-id="${o.id}" data-status="${st}">${label}</button>`;
        // show relevant transitions
        let html = `<button class="btn btn-sm btn-info me-1" data-act="view" data-id="${o.id}">Xem chi tiết</button>`;
        if(s==='pending') html += btn('Đã thanh toán','paid','btn-outline-success') + btn('Hủy','canceled','btn-outline-danger');
        if(s==='paid') html += btn('Đang giao','shipped','btn-outline-primary') + btn('Hủy','canceled','btn-outline-danger');
        if(s==='shipped') html += btn('Hoàn thành','completed','btn-outline-success');
        return html || '<span class="text-muted">Không có hành động</span>';
      };
      function render(){
        const q = (search.value||'').toLowerCase();
        const st = statusSel.value||'';
        const rows = list.filter(o => {
          const hay = (o.fullName||'').toLowerCase();
          return (!q || hay.includes(q)) && (!st || (o.status||'')===st);
        });
        tbody.innerHTML = rows.map(o=>`<tr><td>${o.id}</td><td>${o.fullName||''}</td><td>${fmtDate(o.created_at)}</td><td>${fmtVND(o.total)}</td><td>${fmtStatus(o.status)}</td><td>${actions(o)}</td></tr>`).join('')||'<tr><td colspan="6">No data</td></tr>';
      }
      search.addEventListener('input', render);
      statusSel.addEventListener('change', render);
      async function updateStatus(id, status){
        const r = await fetch('/admin/orders/'+id+'/status', { method:'PATCH', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ status }) });
        if(!r.ok) throw new Error('HTTP '+r.status);
        // update in-memory list
        const it = list.find(x=>x.id===id); if(it) it.status = status;
        render();
      }
      async function viewOrderDetail(id){
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        document.getElementById('modal-order-id').textContent = id;
        const contentEl = document.getElementById('order-detail-content');
        contentEl.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"><span class="visually-hidden">Đang tải...</span></div></div>';
        modal.show();
        
        try{
          const r = await fetch('/admin/orders/'+id, { headers:{ 'Authorization':'Bearer '+token } });
          if(!r.ok) throw new Error('HTTP '+r.status);
          const order = await r.json();
          
          const items = Array.isArray(order.cartItems) ? order.cartItems : [];
          // Calculate subtotal from items (before discounts)
          let subtotal = 0;
          const itemsHtml = items.length > 0 ? items.map(item => {
            const itemName = item.name || item.productName || 'N/A';
            const qty = parseInt(item.quantity || 1);
            const price = parseVND(item.price || 0);
            const total = price * qty;
            subtotal += total; // Add to subtotal
            return `
              <tr>
                <td>${itemName}</td>
                <td class="text-center">${qty}</td>
                <td class="text-end fw-semibold" style="white-space: nowrap;">${fmtVND(price)}</td>
                <td class="text-end fw-bold text-primary" style="white-space: nowrap;">${fmtVND(total)}</td>
              </tr>
            `;
          }).join('') : '<tr><td colspan="4" class="text-center text-muted">Không có sản phẩm</td></tr>';
          
          // Use order.total from database (already includes discounts and shipping)
          // order.total might be a number or string (e.g., "553500.00" or 553500)
          let finalTotal = 0;
          if (typeof order.total === 'number') {
            finalTotal = Math.round(order.total); // Round to integer for VND
          } else if (typeof order.total === 'string') {
            // Parse as float first, then round to integer (VND doesn't have decimals)
            const num = parseFloat(order.total);
            finalTotal = isNaN(num) ? 0 : Math.round(num);
          }
          const totalDiscount = subtotal - finalTotal;
          
          contentEl.innerHTML = `
            <div class="row mb-3">
              <div class="col-md-6">
                <h6 class="text-muted mb-2">Thông tin đơn hàng</h6>
                <p class="mb-1"><strong>Mã đơn:</strong> #${order.id}</p>
                <p class="mb-1"><strong>Ngày đặt:</strong> ${fmtDate(order.created_at)}</p>
                <p class="mb-1"><strong>Trạng thái:</strong> ${fmtStatus(order.status)}</p>
                <p class="mb-0"><strong>Phương thức thanh toán:</strong> ${order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'banktransfer' ? 'Chuyển khoản' : order.paymentMethod || 'N/A'}</p>
              </div>
              <div class="col-md-6">
                <h6 class="text-muted mb-2">Thông tin giao hàng</h6>
                <p class="mb-1"><strong>Người nhận:</strong> ${order.fullName || '-'}</p>
                <p class="mb-1"><strong>Số điện thoại:</strong> ${order.mobile || '-'}</p>
                <p class="mb-1"><strong>Địa chỉ:</strong> ${order.address || '-'}</p>
                <p class="mb-0"><strong>Tỉnh/Thành:</strong> ${order.state || '-'}</p>
              </div>
            </div>
            
            <hr/>
            
            <h6 class="text-muted mb-3">Sản phẩm trong đơn hàng</h6>
            <div class="table-responsive">
              <table class="table table-bordered table-sm">
                <thead class="table-light">
                  <tr>
                    <th>Sản phẩm</th>
                    <th class="text-center" style="width:100px">Số lượng</th>
                    <th class="text-end" style="width:120px; white-space: nowrap;">Đơn giá</th>
                    <th class="text-end" style="width:120px; white-space: nowrap;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="text-end"><strong>Tổng phụ:</strong></td>
                    <td class="text-end" style="white-space: nowrap;"><strong>${fmtVND(subtotal)}</strong></td>
                  </tr>
                  ${totalDiscount > 0 ? `
                  <tr>
                    <td colspan="3" class="text-end text-success"><strong>Giảm giá:</strong></td>
                    <td class="text-end text-success" style="white-space: nowrap;"><strong>-${fmtVND(totalDiscount)}</strong></td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td colspan="3" class="text-end"><strong>Tổng cộng:</strong></td>
                    <td class="text-end" style="white-space: nowrap;"><strong class="fs-5 text-primary">${fmtVND(finalTotal)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `;
        }catch(e){
          contentEl.innerHTML = `<div class="alert alert-danger">Lỗi: ${e.message || 'Không thể tải chi tiết đơn hàng'}</div>`;
        }
      }
      
      tbody.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-act]');
        if(!btn) return;
        const act = btn.getAttribute('data-act');
        const id = Number(btn.getAttribute('data-id'));
        
        if(act === 'status'){
          const st = btn.getAttribute('data-status');
          updateStatus(id, st).catch(()=>alert('Cập nhật thất bại'));
        }else if(act === 'view'){
          viewOrderDetail(id);
        }
      });
      render();
    }catch(e){
      container.querySelector('#o-tbody').innerHTML = '<tr><td colspan="6">Error loading</td></tr>';
    }
  }
})();
