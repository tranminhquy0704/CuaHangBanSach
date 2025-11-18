const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYzMTkzNzM3LCJleHAiOjE3NjMyODAxMzd9._kQ4Tw-79PcEzd-AhcepXZEISDe_GOjqMk-UtkUgjHw';

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
