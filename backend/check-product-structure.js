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
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
  
  console.log('✅ Connected to database\n');
  
  // Get product table structure
  db.query('DESCRIBE product', (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
      db.end();
      return;
    }
    
    console.log('📊 Product Table Structure:');
    console.log('Column Name          | Type');
    console.log('-'.repeat(50));
    rows.forEach(row => {
      console.log(`${row.Field.padEnd(20)} | ${row.Type}`);
    });
    
    db.end();
  });
});
