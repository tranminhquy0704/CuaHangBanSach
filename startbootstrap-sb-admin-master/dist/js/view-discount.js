(function(){
  window.AdminViews = window.AdminViews || {};
  function normalizeVND(val){
    if (val == null) return 0;
    const raw = String(val).trim();
    if (!raw) return 0;
    const normalized = raw.replace(/[^0-9,.-]/g, '');
    if (normalized) {
      const parsed = parseFloat(normalized.replace(',', '.'));
      if (!Number.isNaN(parsed)) {
        return parsed >= 1000 ? Math.round(parsed) : Math.round(parsed * 1000);
      }
    }
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return 0;
    let num = parseInt(digits, 10);
    if (num <= 999) num = num * 1000;
    return num;
  }
  function fmtVND(n){ return normalizeVND(n).toLocaleString('vi-VN')+' ₫'; }
  
  window.AdminViews['discount'] = async function(container){
    const token = localStorage.getItem('token');
    let editingId = null;
    let editForm = { discount: '', oldPrice: '' };
    
    container.innerHTML = `
      <h1 class="mt-4">Quản Lý Giảm Giá</h1>
      <div class="card mb-4">
        <div class="card-header d-flex flex-wrap gap-2 align-items-center">
          <span><i class="fas fa-percent me-1"></i> Danh sách sản phẩm</span>
          <div class="ms-auto d-flex gap-2 flex-wrap">
            <select id="dc-category" class="form-select form-select-sm" style="max-width:200px">
              <option value="">Tất cả thể loại</option>
            </select>
            <input id="dc-search" class="form-control form-control-sm" style="max-width:240px" placeholder="Tìm kiếm sản phẩm..."/>
          </div>
        </div>
        <div class="card-body">
          <table class="table table-striped table-bordered mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Hình ảnh</th>
                <th>Tên sản phẩm</th>
                <th>Giá hiện tại</th>
                <th>Giá cũ</th>
                <th>% Giảm giá</th>
                <th style="width:100px">Thao tác</th>
              </tr>
            </thead>
            <tbody id="dc-tbody"><tr><td colspan="7">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>`;
    
    try{
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/admin/products', { headers: { 'Authorization': 'Bearer '+token } }),
        fetch('/admin/categories', { headers: { 'Authorization': 'Bearer '+token } })
      ]);
      
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      
      let list = Array.isArray(productsData)?productsData:[];
      let categories = Array.isArray(categoriesData)?categoriesData:[];
      const tbody = container.querySelector('#dc-tbody');
      const search = container.querySelector('#dc-search');
      const categorySelect = container.querySelector('#dc-category');
      
      // Populate category dropdown
      categorySelect.innerHTML = '<option value="">Tất cả thể loại</option>' + 
        categories.map(cat => `<option value="${cat.id}">${cat.name||''}</option>`).join('');
      
      function render(){
        const q = (search.value||'').toLowerCase();
        const catId = categorySelect.value ? Number(categorySelect.value) : null;
        const rows = list.filter(p => {
          const hay = (p.name||'').toLowerCase();
          const matchSearch = !q || hay.includes(q);
          const matchCategory = !catId || (p.category_id && Number(p.category_id) === catId);
          return matchSearch && matchCategory;
        });
        
        tbody.innerHTML = rows.map(p => {
          const isEditing = editingId === p.id;
          const category = categories.find(c => c.id === p.category_id);
          const categoryName = category ? category.name : 'Chưa phân loại';
          const price = normalizeVND(p.price||0);
          const oldPrice = p.oldPrice ? normalizeVND(p.oldPrice) : null;
          return `
            <tr>
              <td>${p.id}</td>
              <td>
                <img src="${p.img||''}" alt="${p.name||''}" 
                     style="width:50px;height:50px;object-fit:cover;border-radius:4px;" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'50\\' height=\\'50\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\'%3ENo img%3C/text%3E%3C/svg%3E'"/>
              </td>
              <td>
                <div class="fw-semibold">${p.name||''}</div>
                <small class="text-muted">${categoryName}</small>
              </td>
              <td>${fmtVND(price)}</td>
              <td>
                ${isEditing ? 
                  `<input type="number" class="form-control form-control-sm" 
                          id="dc-oldPrice-${p.id}" value="${oldPrice ? oldPrice : ''}" 
                          placeholder="Giá cũ" style="width:120px;" step="1000" min="0">` :
                  (oldPrice ? fmtVND(oldPrice) : '-')
                }
              </td>
              <td>
                ${isEditing ? 
                  `<div class="input-group input-group-sm" style="width:120px;">
                    <input type="number" class="form-control" 
                           id="dc-discount-${p.id}" value="${p.discount||''}" 
                           placeholder="%" min="0" max="100">
                    <span class="input-group-text">%</span>
                  </div>` :
                  (p.discount ? p.discount + '%' : '-')
                }
              </td>
              <td>
                ${isEditing ? 
                  `<button class="btn btn-sm btn-success me-1" data-act="save" data-id="${p.id}">
                    <i class="fas fa-check"></i>
                  </button>
                  <button class="btn btn-sm btn-secondary" data-act="cancel" data-id="${p.id}">
                    <i class="fas fa-times"></i>
                  </button>` :
                  `<button class="btn btn-sm btn-primary" data-act="edit" data-id="${p.id}">
                    <i class="fas fa-edit"></i>
                  </button>`
                }
              </td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="7">Không có sản phẩm nào</td></tr>';
      }
      
      search.addEventListener('input', render);
      categorySelect.addEventListener('change', render);
      
      tbody.addEventListener('click', async (e)=>{
        const btn = e.target.closest('button[data-act]');
        if(!btn) return;
        const act = btn.getAttribute('data-act');
        const id = Number(btn.getAttribute('data-id'));
        const product = list.find(p => p.id === id);
        if(!product) return;
        
        if(act === 'edit'){
          editingId = id;
          editForm = {
            discount: product.discount || '',
            oldPrice: product.oldPrice || ''
          };
          render();
        }else if(act === 'cancel'){
          editingId = null;
          editForm = { discount: '', oldPrice: '' };
          render();
        }else if(act === 'save'){
          const discountInput = container.querySelector(`#dc-discount-${id}`);
          const oldPriceInput = container.querySelector(`#dc-oldPrice-${id}`);
          
            const discount = discountInput.value ? Number(discountInput.value) : null;
            const oldPrice = oldPriceInput.value ? normalizeVND(oldPriceInput.value) : null;
          
          try{
            const res = await fetch(`/admin/products/${id}`, {
              method: 'PUT',
              headers: {
                'Authorization': 'Bearer '+token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...product,
                discount: discount,
                oldPrice: oldPrice
              })
            });
            
            if(!res.ok) throw new Error('HTTP '+res.status);
            
            // Update local state
            const item = list.find(x => x.id === id);
            if(item){
              item.discount = discount;
              item.oldPrice = oldPrice;
            }
            
            editingId = null;
            editForm = { discount: '', oldPrice: '' };
            render();
          }catch(e){
            alert('Có lỗi xảy ra khi cập nhật giảm giá: ' + (e.message||'Unknown error'));
          }
        }
      });
      
      render();
    }catch(e){
      container.querySelector('#dc-tbody').innerHTML = 
        '<tr><td colspan="7">Lỗi: ' + (e.message||'Không thể tải dữ liệu') + '</td></tr>';
    }
  }
})();

