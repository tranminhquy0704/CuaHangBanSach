(function(){
  const table = document.querySelector('#datatablesSimple tbody');
  if(!table) return;
  const token = localStorage.getItem('token');
  if(!token) return; // admin only
  fetch('/admin/orders/recent?limit=50', { headers: { 'Authorization': 'Bearer '+token } })
    .then(r => r.ok ? r.json() : [])
    .then(rows => {
      table.innerHTML = '';
      rows.forEach(o => {
        const tr = document.createElement('tr');
        const date = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '';
        tr.innerHTML = `<td>${o.id}</td><td>${o.fullName||''}</td><td>${date}</td><td>${(Number(o.total)||0).toLocaleString('vi-VN')}₫</td><td>${o.status||''}</td>`;
        table.appendChild(tr);
      });
    })
    .catch(()=>{});
})();
