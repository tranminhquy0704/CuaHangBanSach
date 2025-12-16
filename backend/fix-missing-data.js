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
  
  // Update all products with null author/publisher
  const updates = [
    { id: 59, author: 'Đào Văn', publisher: 'NXB Hội Nhà Văn' }
  ];
  
  // First, check how many products have null author/publisher
  db.query('SELECT id, name FROM product WHERE author IS NULL OR publisher IS NULL LIMIT 10', (err, results) => {
    if (err) {
      console.error('Query error:', err);
      db.end();
      return;
    }
    
    console.log('\nProducts with missing author/publisher:');
    results.forEach(p => console.log(`- ID ${p.id}: ${p.name}`));
    
    // Update product 59 specifically
    db.query(
      'UPDATE product SET author = ?, publisher = ? WHERE id = 59',
      ['Đào Văn', 'NXB Hội Nhà Văn'],
      (err, result) => {
        if (err) {
          console.error('Update error:', err);
        } else {
          console.log('\n✓ Updated product 59 successfully!');
        }
        db.end();
      }
    );
  });
});
