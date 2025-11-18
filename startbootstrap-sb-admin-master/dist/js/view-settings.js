(function(){
  window.AdminViews = window.AdminViews || {};
  window.AdminViews['settings'] = async function(container){
    const token = localStorage.getItem('token');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4 mt-4">
        <h1 class="mb-0"><i class="fas fa-cog me-2"></i>Cài đặt</h1>
        <button id="st-save" class="btn btn-primary"><i class="fas fa-save me-2"></i>Lưu tất cả thay đổi</button>
      </div>

      <!-- Thông tin cửa hàng -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-store me-2"></i>Thông tin cửa hàng</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Tên cửa hàng sách <span class="text-danger">*</span></label>
              <input type="text" class="form-control" data-key="store.name" placeholder="Ví dụ: Shop Bán Sách Online"/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Slogan</label>
              <input type="text" class="form-control" data-key="store.slogan" placeholder="Ví dụ: Tri thức cho mọi người - Sách hay mỗi ngày"/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Hotline <span class="text-danger">*</span></label>
              <input type="text" class="form-control" data-key="store.hotline" placeholder="Ví dụ: 1900 1234"/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Email liên hệ <span class="text-danger">*</span></label>
              <input type="email" class="form-control" data-key="store.email" placeholder="Ví dụ: contact@example.com"/>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Địa chỉ cửa hàng</label>
              <textarea class="form-control" rows="2" data-key="store.address" placeholder="Nhập địa chỉ đầy đủ của cửa hàng"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Giờ làm việc</label>
              <input type="text" class="form-control" data-key="store.working_hours" placeholder="Ví dụ: 8:00 - 22:00 hàng ngày"/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Mô tả cửa hàng</label>
              <textarea class="form-control" rows="2" data-key="store.description" placeholder="Mô tả ngắn về cửa hàng sách của bạn"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Mạng xã hội -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-share-alt me-2"></i>Mạng xã hội</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold"><i class="fab fa-facebook me-2"></i>Facebook</label>
              <input type="url" class="form-control" data-key="social.facebook" placeholder="https://facebook.com/..."/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold"><i class="fab fa-instagram me-2"></i>Instagram</label>
              <input type="url" class="form-control" data-key="social.instagram" placeholder="https://instagram.com/..."/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold"><i class="fab fa-youtube me-2"></i>YouTube</label>
              <input type="url" class="form-control" data-key="social.youtube" placeholder="https://youtube.com/..."/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold"><i class="fab fa-tiktok me-2"></i>TikTok</label>
              <input type="url" class="form-control" data-key="social.tiktok" placeholder="https://tiktok.com/..."/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Zalo</label>
              <input type="text" class="form-control" data-key="social.zalo" placeholder="Số điện thoại hoặc link Zalo"/>
            </div>
          </div>
        </div>
      </div>

      <!-- Vận chuyển -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-truck me-2"></i>Vận chuyển</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Phí vận chuyển (VNĐ)</label>
              <input type="number" class="form-control" data-key="shipping.fee" placeholder="30000" min="0"/>
              <small class="text-muted">Phí ship mặc định cho đơn hàng</small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Miễn phí ship từ (VNĐ)</label>
              <input type="number" class="form-control" data-key="shipping.free_threshold" placeholder="500000" min="0"/>
              <small class="text-muted">Miễn phí ship khi đơn hàng >= giá trị này</small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Thời gian giao hàng (ngày)</label>
              <input type="number" class="form-control" data-key="shipping.delivery_days" placeholder="3" min="1"/>
              <small class="text-muted">Số ngày dự kiến giao hàng</small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Khu vực giao hàng</label>
              <input type="text" class="form-control" data-key="shipping.areas" placeholder="Toàn quốc, TP.HCM, Hà Nội..."/>
            </div>
          </div>
        </div>
      </div>

      <!-- Khuyến mãi & Giảm giá -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-percent me-2"></i>Khuyến mãi & Giảm giá</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Giảm giá khi mua nhiều (%)</label>
              <input type="number" class="form-control" data-key="promo.bulk_discount" placeholder="5" min="0" max="100"/>
              <small class="text-muted">Áp dụng khi mua từ 5 sản phẩm trở lên</small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Ngưỡng mua nhiều (sản phẩm)</label>
              <input type="number" class="form-control" data-key="promo.bulk_threshold" placeholder="5" min="2"/>
              <small class="text-muted">Số sản phẩm tối thiểu để được giảm giá</small>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch mt-4">
                <input class="form-check-input" type="checkbox" role="switch" id="promo-voucher" data-key="promo.enable_voucher">
                <label class="form-check-label fw-bold" for="promo-voucher">Bật tính năng Voucher</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch mt-4">
                <input class="form-check-input" type="checkbox" role="switch" id="promo-flashsale" data-key="promo.enable_flashsale">
                <label class="form-check-label fw-bold" for="promo-flashsale">Bật Flash Sale</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cài đặt hiển thị -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-eye me-2"></i>Cài đặt hiển thị</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Số sách mỗi trang</label>
              <input type="number" class="form-control" data-key="display.products_per_page" placeholder="12" min="1"/>
              <small class="text-muted">Số lượng sách hiển thị trên mỗi trang danh sách</small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Múi giờ</label>
              <input type="text" class="form-control" data-key="format.timezone" placeholder="Asia/Ho_Chi_Minh"/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Tiền tệ</label>
              <input type="text" class="form-control" data-key="format.currency" placeholder="VND" value="VND"/>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Số thập phân</label>
              <input type="number" class="form-control" data-key="format.decimals" placeholder="0" min="0" max="2" value="0"/>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch mt-4">
                <input class="form-check-input" type="checkbox" role="switch" id="display-rating" data-key="display.show_rating">
                <label class="form-check-label fw-bold" for="display-rating">Hiển thị đánh giá sao</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch mt-4">
                <input class="form-check-input" type="checkbox" role="switch" id="display-sold" data-key="display.show_sold">
                <label class="form-check-label fw-bold" for="display-sold">Hiển thị số lượng đã bán</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Thanh toán -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-money-bill-wave me-2"></i>Thanh toán</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="pay-sandbox" data-key="payment.sandbox">
                <label class="form-check-label fw-bold" for="pay-sandbox">Bật chế độ Sandbox (Test)</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="pay-cod" data-key="payment.enable_cod">
                <label class="form-check-label fw-bold" for="pay-cod">Cho phép thanh toán COD</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="pay-bank" data-key="payment.enable_bank">
                <label class="form-check-label fw-bold" for="pay-bank">Cho phép chuyển khoản ngân hàng</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="pay-ewallet" data-key="payment.enable_ewallet">
                <label class="form-check-label fw-bold" for="pay-ewallet">Cho phép ví điện tử (Momo, ZaloPay)</label>
              </div>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Thông tin tài khoản ngân hàng</label>
              <textarea class="form-control" rows="3" data-key="payment.bank_info" placeholder="STK: 1234567890&#10;Chủ TK: Nguyễn Văn A&#10;Ngân hàng: Vietcombank"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Tồn kho -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-boxes me-2"></i>Tồn kho</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Ngưỡng tồn kho thấp</label>
              <input type="number" class="form-control" data-key="inventory.low_threshold" placeholder="10" min="1"/>
              <small class="text-muted">Cảnh báo khi tồn kho <= giá trị này</small>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch mt-4">
                <input class="form-check-input" type="checkbox" role="switch" id="inventory-hide" data-key="inventory.auto_hide">
                <label class="form-check-label fw-bold" for="inventory-hide">Tự động ẩn sản phẩm hết hàng</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chính sách -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-file-contract me-2"></i>Chính sách</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fw-bold">Chính sách bảo hành</label>
              <textarea class="form-control" rows="4" data-key="policy.warranty" placeholder="Nhập chính sách bảo hành..."></textarea>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Chính sách đổi trả</label>
              <textarea class="form-control" rows="4" data-key="policy.return" placeholder="Nhập chính sách đổi trả..."></textarea>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Chính sách vận chuyển</label>
              <textarea class="form-control" rows="4" data-key="policy.shipping" placeholder="Nhập chính sách vận chuyển..."></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Seed dữ liệu -->
      <div class="card mb-4 shadow-sm border-warning">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-database me-2"></i>Công cụ phát triển - Seed dữ liệu báo cáo</h5>
        </div>
        <div class="card-body">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i><strong>Chú ý:</strong> Tính năng này chỉ dùng để tạo dữ liệu mẫu cho báo cáo. Sẽ tạo đơn hàng thật trong database.
          </div>
          <div class="row g-2 align-items-end">
            <div class="col-sm-2">
              <label class="form-label fw-bold">Năm</label>
              <input type="number" id="seed-year" class="form-control" value="${new Date().getFullYear()}">
            </div>
            <div class="col-sm-2">
              <label class="form-label fw-bold">Đơn/tháng (tối thiểu)</label>
              <input type="number" id="seed-min" class="form-control" value="3" min="1">
            </div>
            <div class="col-sm-2">
              <label class="form-label fw-bold">Đơn/tháng (tối đa)</label>
              <input type="number" id="seed-max" class="form-control" value="8" min="1">
            </div>
            <div class="col-sm-3">
              <button id="seed-btn" class="btn btn-warning"><i class="fas fa-seedling me-2"></i>Seed dữ liệu 12 tháng</button>
            </div>
          </div>
          <small class="text-muted d-block mt-2">Tạo đơn hàng thật trong DB cho 12 tháng của năm đã chọn (từ sản phẩm hiện có). Sau khi seed, vào Dashboard chọn "Theo năm" để xem biểu đồ.</small>
        </div>
      </div>`;

    function getInputs(){ return Array.from(container.querySelectorAll('[data-key]')); }
    function readValues(){
      const map = {};
      for(const el of getInputs()){
        const key = el.getAttribute('data-key');
        const type = (el.type === 'checkbox') ? 'bool' : (el.type === 'number' ? 'number' : 'string');
        const value = (el.type === 'checkbox') ? (el.checked ? 'true':'false') : String(el.value||'');
        map[key] = { key, value, type };
      }
      return Object.values(map);
    }
    function fillValues(data){
      for(const el of getInputs()){
        const key = el.getAttribute('data-key');
        const rec = data && data[key];
        if(!rec) continue;
        if(el.type === 'checkbox') el.checked = String(rec.value) === 'true';
        else el.value = rec.value || '';
      }
    }
    async function load(){
      try {
        const r = await fetch('/admin/settings', { headers:{ 'Authorization':'Bearer '+token } });
        if(!r.ok) {
          console.warn('Settings not found, using defaults');
          return;
        }
        const data = await r.json();
        fillValues(data);
      } catch(e) {
        console.warn('Error loading settings:', e);
      }
    }
    async function save(){
      const body = readValues();
      try {
        const r = await fetch('/admin/settings', { method:'PUT', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
        if(!r.ok) {
          const error = await r.json().catch(() => ({ message: 'Lỗi không xác định' }));
          throw new Error(error.message || 'HTTP '+r.status);
        }
        alert('Đã lưu cài đặt thành công!');
      } catch(e) {
        throw e;
      }
    }
    container.querySelector('#st-save').addEventListener('click', ()=> save().catch((e)=>alert('Lưu thất bại: '+ e.message)));
    const seedBtn = container.querySelector('#seed-btn');
    if(seedBtn){
      seedBtn.addEventListener('click', async ()=>{
        if(!confirm('Bạn có chắc muốn seed dữ liệu? Điều này sẽ tạo đơn hàng thật trong database.')) return;
        const year = Number(container.querySelector('#seed-year').value)||new Date().getFullYear();
        const perMonthMin = Math.max(1, Number(container.querySelector('#seed-min').value)||3);
        const perMonthMax = Math.max(perMonthMin, Number(container.querySelector('#seed-max').value)||8);
        seedBtn.disabled = true;
        seedBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
        try{
          const r = await fetch('/admin/demo/seed-orders', { method:'POST', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ year, perMonthMin, perMonthMax }) });
          const data = await r.json();
          if(!r.ok) throw new Error(data?.message||('HTTP '+r.status));
          alert('Đã seed: '+ (data.inserted||0) +' đơn. Vào Dashboard và chọn "Theo năm" để xem biểu đồ.');
        }catch(e){ 
          alert('Seed thất bại: '+ e.message); 
        } finally {
          seedBtn.disabled = false;
          seedBtn.innerHTML = '<i class="fas fa-seedling me-2"></i>Seed dữ liệu 12 tháng';
        }
      });
    }
    try{ await load(); }catch(e){ /* ignore */ }
  };
})();

