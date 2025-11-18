const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.a7_MsOCWwQQI8S-C8VqNQnOKxWvYQEQxRHFAQJiHWCY';

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/admin/customers/3/related-orders',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

console.log('Making request...');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log('Response (raw):', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  process.exit(1);
}, 5000);

req.end();
  const options = { hostname: '127.0.0.1', port: 5000, path, method: 'GET', headers: { Authorization: 'Bearer '+token } };
    const req = http.request(options, res => {
      let data='';
      res.on('data', chunk => data += chunk);
      res.on('end', ()=> resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async ()=>{
  try{
    const list = await get('/admin/customers/list');
    console.log('\n/list status=',list.status);
    console.log(list.body);
    const users = JSON.parse(list.body || '[]') || [];
    for(const u of users){
      const p = `/admin/customers/${u.id}/detail`;
      const det = await get(p);
      console.log('\n/detail '+u.id+' status=',det.status);
      console.log(det.body);
    }
  }catch(e){
    console.error('ERR',e);
  }
})();
