const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shopbansach'
});

// Simulate what the related-orders API does
const userId = 3; // user2
const userSql = 'SELECT id, email FROM `user` WHERE id = ? LIMIT 1';
db.query(userSql, [userId], (uErr, uRows) => {
  if (uErr) {
    console.error('Error fetching user:', uErr);
    db.end();
    return;
  }
  
  if (!uRows || uRows.length === 0) {
    console.log('User not found');
    db.end();
    return;
  }
  
  const user = uRows[0];
  console.log('User:', user);
  
  // Check the query used
  const likeExpr = 'LOWER(?)';
  const sql = `SELECT id, fullName, total, status, created_at, user_id FROM orders
    WHERE user_id = ?
      OR LOWER(fullName) LIKE CONCAT('%', LOWER(?), '%')
      OR LOWER(cartItems) LIKE CONCAT('%', LOWER(?), '%')
      OR LOWER(address) LIKE CONCAT('%', LOWER(?), '%')
      OR LOWER(mobile) LIKE CONCAT('%', LOWER(?), '%')
    ORDER BY id DESC`;
  
  const params = [userId, user.email, user.email, user.email, user.email];
  console.log('Query params:', params);
  
  db.query(sql, params, (oErr, orders) => {
    if (oErr) {
      console.error('Error fetching orders:', oErr);
    } else {
      console.log('Found orders:', orders.length);
      console.log(JSON.stringify(orders, null, 2));
    }
    db.end();
  });
});
