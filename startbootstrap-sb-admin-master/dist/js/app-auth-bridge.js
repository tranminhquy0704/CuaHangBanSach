(function(){
  function getTokenFromUrl(){
    try{
      const url = new URL(window.location.href);
      const q = url.searchParams.get('token') || url.searchParams.get('t');
      if(q) return q;
      const hash = url.hash.replace(/^#/, '');
      if(!hash) return null;
      const sp = new URLSearchParams(hash);
      return sp.get('token') || sp.get('t');
    }catch(e){ return null; }
  }
  const tk = getTokenFromUrl();
  if(tk){
    try{ localStorage.setItem('token', tk); }catch(e){}
    try{
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('t');
      if(url.hash){
        const sp = new URLSearchParams(url.hash.replace(/^#/, ''));
        sp.delete('token'); sp.delete('t');
        const newHash = sp.toString();
        history.replaceState({}, '', url.pathname + (url.search||'') + (newHash?('#'+newHash):''));
      } else {
        history.replaceState({}, '', url.pathname + (url.search||''));
      }
    }catch(e){}
  }
})();
