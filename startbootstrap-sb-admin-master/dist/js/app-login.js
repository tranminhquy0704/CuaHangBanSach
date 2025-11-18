(function(){
  function $(id){ return document.getElementById(id); }
  async function submitLogin(e){
    e.preventDefault();
    const email = $('inputEmail').value.trim();
    const password = $('inputPassword').value.trim();
    if(!email || !password){ alert('Vui lòng nhập email và mật khẩu'); return; }
    try{
      const res = await fetch('/admin/login',{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      if(!res.ok){
        const msg = await res.json().catch(()=>({message:'Login failed'}));
        alert(msg.message || 'Đăng nhập thất bại');
        return;
      }
      const data = await res.json();
      if(data.token){ localStorage.setItem('token', data.token); }
      window.location.href = '/admin';
    }catch(err){
      console.error(err);
      alert('Có lỗi xảy ra khi đăng nhập');
    }
  }
  document.addEventListener('DOMContentLoaded',function(){
    const form = document.getElementById('adminLoginForm');
    if(form){ form.addEventListener('submit', submitLogin); }
  });
})();
