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
  
  db.query('SELECT id, name, author, publisher, price, rating, rating_count, sold FROM product WHERE id = 59', (err, results) => {
    if (err) {
      console.error('Query error:', err);
      db.end();
      process.exit(1);
    }
    
    console.log('\n=== Product ID 59 ===');
    console.log(JSON.stringify(results[0], null, 2));
    
    db.end();
  });
});
