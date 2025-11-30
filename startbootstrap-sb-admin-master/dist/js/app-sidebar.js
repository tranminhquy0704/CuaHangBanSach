(function(){
  function buildItem(href, icon, text){
    return `\n      <a class="nav-link" href="${href}">\n        <div class="sb-nav-link-icon"><i class="${icon}"></i></div>\n        ${text}\n      </a>`;
  }
  document.addEventListener('DOMContentLoaded', function(){
    var nav = document.querySelector('#layoutSidenav_nav .sb-sidenav-menu .nav');
    if(!nav) return;
    nav.innerHTML = `
      <div class="sb-sidenav-menu-heading">CORE</div>
      ${buildItem('#/', 'fas fa-home', 'Tổng quan')}
      <div class="sb-sidenav-menu-heading">QUẢN LÝ</div>
      ${buildItem('#/books', 'fas fa-book', 'Sách')}
      ${buildItem('#/customers', 'fas fa-users', 'Khách hàng')}
      ${buildItem('#/orders', 'fas fa-shopping-cart', 'Đơn hàng')}
      ${buildItem('#/revenue', 'fas fa-dollar-sign', 'Doanh thu')}
      ${buildItem('#/categories', 'fas fa-tags', 'Thể loại')}
      ${buildItem('#/publishers', 'fas fa-building', 'NXB / Tác giả')}
      ${buildItem('#/inventory', 'fas fa-warehouse', 'Kho hàng')}
      ${buildItem('#/flashsale', 'fas fa-bolt', 'Flash Sale')}
      ${buildItem('#/discount', 'fas fa-percent', 'Giảm giá')}
      <div class="sb-sidenav-menu-heading">HỆ THỐNG</div>
      ${buildItem('#/contacts', 'fas fa-envelope', 'Liên hệ')}
      ${buildItem('#/settings', 'fas fa-cog', 'Cài đặt')}
      ${buildItem('#/roles', 'fas fa-shield-alt', 'Phân quyền')}
    `;
  });
})();
