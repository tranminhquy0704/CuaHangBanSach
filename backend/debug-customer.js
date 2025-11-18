const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shopbansach'
});

// Get user ID for minhquy@123
db.query('SELECT id, email FROM user WHERE email = ?', ['minhquy@123'], (err, users) => {
  if(err) {
    console.error('Error getting user:', err);
    db.end();
    return;
  }
  
  if(!users || users.length === 0) {
    console.log('User minhquy@123 not found');
    db.end();
    return;
  }
  
  const user = users[0];
  console.log('User found:', user);
  
  // Check orders with user_id
  db.query('SELECT id, fullName, email, cartItems, status FROM orders WHERE user_id = ?', [user.id], (err, rows) => {
    if(err) {
      console.error('Error getting orders by user_id:', err);
    } else {
      console.log('\nOrders by user_id =', user.id, ':', rows.length, 'found');
      console.log(JSON.stringify(rows, null, 2));
    }
    
    // Check orders by email matching in various fields
    db.query(`SELECT id, fullName, email, cartItems, user_id, status FROM orders 
      WHERE LOWER(fullName) LIKE ? 
         OR LOWER(cartItems) LIKE ? 
         OR LOWER(address) LIKE ?
         OR LOWER(mobile) LIKE ?
      ORDER BY id DESC LIMIT 20`, 
      [`%${user.email.toLowerCase()}%`, `%${user.email.toLowerCase()}%`, `%${user.email.toLowerCase()}%`, `%${user.email.toLowerCase()}%`],
      (err, rows) => {
        if(err) {
          console.error('Error getting related orders:', err);
        } else {
          console.log('\nOrders by email matching:', rows.length, 'found');
          console.log(JSON.stringify(rows, null, 2));
        }
        db.end();
      });
  });
});
