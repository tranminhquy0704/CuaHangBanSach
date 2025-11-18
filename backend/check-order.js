const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shopbansach'
});

db.query('SELECT id, user_id, fullName, cartItems, address, mobile, created_at FROM orders ORDER BY id DESC LIMIT 5', (err, rows) => {
  if(err) {
    console.error('Error:', err);
  } else {
    console.log('Last 5 orders:');
    console.log(JSON.stringify(rows, null, 2));
  }
  db.end();
});
