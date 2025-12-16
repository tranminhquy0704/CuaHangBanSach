require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopbansach',
});

// Dữ liệu mẫu để cập nhật cho các sản phẩm thiếu
const defaultData = {
  author: 'Nhiều tác giả',
  publisher: 'NXB Văn Học'
};

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  
  console.log('Connected to database\n');
  
  // Lấy danh sách sản phẩm thiếu author hoặc publisher
  db.query('SELECT id, name, author, publisher FROM product WHERE author IS NULL OR publisher IS NULL', (err, products) => {
    if (err) {
      console.error('Query error:', err);
      db.end();
      process.exit(1);
    }
    
    if (products.length === 0) {
      console.log('✓ Tất cả sản phẩm đã có đầy đủ thông tin tác giả và NXB!');
      db.end();
      return;
    }
    
    console.log(`Tìm thấy ${products.length} sản phẩm thiếu dữ liệu:\n`);
    products.forEach(p => {
      console.log(`- ID ${p.id}: ${p.name}`);
      console.log(`  Author: ${p.author || 'NULL'}, Publisher: ${p.publisher || 'NULL'}`);
    });
    
    console.log('\n--- BẮT ĐẦU CẬP NHẬT ---\n');
    
    let completed = 0;
    
    products.forEach((product, index) => {
      const author = product.author || defaultData.author;
      const publisher = product.publisher || defaultData.publisher;
      
      db.query(
        'UPDATE product SET author = ?, publisher = ? WHERE id = ?',
        [author, publisher, product.id],
        (err, result) => {
          if (err) {
            console.error(`✗ Lỗi khi cập nhật ID ${product.id}:`, err.message);
          } else {
            console.log(`✓ Cập nhật ID ${product.id}: ${product.name}`);
            console.log(`  → Author: ${author}, Publisher: ${publisher}`);
          }
          
          completed++;
          
          if (completed === products.length) {
            console.log(`\n=== HOÀN TẤT: Đã cập nhật ${completed}/${products.length} sản phẩm ===`);
            db.end();
          }
        }
      );
    });
  });
});
