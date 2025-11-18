const http = require('http');

// Test the API
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/admin/customers/3/related-orders',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.a7_MsOCWwQQI8S-C8VqNQnOKxWvYQEQxRHFAQJiHWCY'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
