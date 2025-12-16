require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopbansach',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // Update product 59 with author and publisher
  db.query(
    'UPDATE product SET author = ?, publisher = ? WHERE id = 59',
    ['Đào Văn', 'NXB Hội Nhà Văn'],
    (err, result) => {
      if (err) {
        console.error('Update error:', err);
      } else {
        console.log('Updated product 59 successfully!');
        console.log('Affected rows:', result.affectedRows);
      }
      db.end();
    }
  );
});
