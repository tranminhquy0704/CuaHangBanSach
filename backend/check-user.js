const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shopbansach'
});

db.query('SELECT id, email, status FROM user WHERE email LIKE "%user2%" OR id = (SELECT id FROM user ORDER BY created_at DESC LIMIT 1)', (err, rows) => {
  if(err) {
    console.error('Error:', err);
  } else {
    console.log('Users:');
    console.log(JSON.stringify(rows, null, 2));
  }
  db.end();
});
