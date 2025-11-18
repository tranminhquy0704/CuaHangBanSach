require('dotenv').config();
const mysql = require('mysql2/promise');
(async ()=>{
  try{
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'login',
    });
    // Find orders and potential user matches by email (case-insensitive exact)
    const [rows] = await conn.execute(`
      SELECT o.id AS order_id, o.fullName, o.email AS order_email, o.mobile, o.address, o.total,
             u.id AS user_id, u.email AS user_email
      FROM orders o
      LEFT JOIN user u ON LOWER(TRIM(o.email)) = LOWER(TRIM(u.email))
      ORDER BY o.id DESC
      LIMIT 200
    `);
    const matches = rows.filter(r => r.user_id !== null);
    console.log('Total rows scanned:', rows.length);
    console.log('Potential exact email matches (order -> user):', matches.length);
    matches.slice(0,200).forEach(m => {
      console.log(`order_id=${m.order_id} total=${m.total} order_email='${m.order_email}' => user_id=${m.user_id} user_email='${m.user_email}'`);
    });
    // Also show orders without a match
    const nomatch = rows.filter(r => r.user_id === null);
    console.log('\nOrders without matching user by email (sample 20):', Math.min(20, nomatch.length));
    nomatch.slice(0,20).forEach(m => console.log(`order_id=${m.order_id} total=${m.total} order_email='${m.order_email}' fullName='${m.fullName}'`));
    await conn.end();
  }catch(e){
    console.error('Error:', e && e.message || e);
    process.exit(1);
  }
})();
