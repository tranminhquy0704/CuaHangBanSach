(function(){
  window.AdminViews = window.AdminViews || {};
  function showOverview(){
    const ov = document.getElementById('view-overview');
    const spa = document.getElementById('spa-content');
    if(ov) ov.style.display = '';
    if(spa){ spa.style.display = 'none'; spa.innerHTML=''; }
  }
  async function showView(name){
    const ov = document.getElementById('view-overview');
    const spa = document.getElementById('spa-content');
    if(ov) ov.style.display = 'none';
    if(!spa) return;
    spa.style.display = '';
    const view = window.AdminViews[name];
    if(typeof view === 'function'){
      await view(spa);
    } else {
      spa.innerHTML = '<div class="card"><div class="card-body">Đang phát triển...</div></div>';
    }
  }
  function route(){
    const hash = (location.hash || '#/').replace(/^#/, '');
    const seg = hash.split('?')[0].replace(/^\//,'');
    if(!seg){ showOverview(); return; }
    showView(seg);
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
