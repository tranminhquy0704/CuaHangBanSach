require('dotenv').config();
const mysql = require('mysql2/promise');
require('dotenv').config();
const mysql = require('mysql2/promise');
(async ()=>{
  const orderId = Number(process.argv[2] || 1833);
  const userEmail = process.argv[3] || 'minhquy@123';
  try{
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      // default to the shop database used by the project
      database: process.env.DB_NAME || 'shopbansach',
    });
    console.log('Connecting to DB:', (process.env.DB_NAME || 'shopbansach'));
    // find user (case-insensitive, trimmed)
    const [users] = await conn.execute('SELECT id, email FROM `user` WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1', [userEmail]);
    if (!users || users.length === 0) {
      console.error('User not found for email:', userEmail);
      const [all] = await conn.execute('SELECT id, email FROM `user`');
      console.log('Existing users:', all);
      await conn.end();
      process.exit(1);
    }
    const user = users[0];
    console.log('Found user:', user.id, user.email);
    // ensure column exists (MySQL 8+ supports IF NOT EXISTS; ignore errors otherwise)
    try{
      await conn.execute('ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `user_id` INT NULL');
    }catch(e){
      // If ALTER fails (older MySQL), ignore - assume column may already exist
      console.log('ALTER TABLE user_id ignored or failed:', e.message || e);
    }
    // update order
    const [r] = await conn.execute('UPDATE orders SET user_id = ? WHERE id = ?', [user.id, orderId]);
    console.log('Update result affectedRows:', r && r.affectedRows);
    const [rows] = await conn.execute('SELECT id, fullName, email, mobile, address, total, user_id FROM orders WHERE id = ?', [orderId]);
    console.log('Order after update:', rows[0]);
    await conn.end();
    process.exit(0);
  }catch(e){
    console.error('Error:', e.message || e);
    process.exit(2);
  }
})();
