require('dotenv').config();
const mysql = require('mysql2/promise');
(async ()=>{
  try{
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'shopbansach',
    });
    const [rows] = await conn.execute('SELECT id, email, created_at FROM `user` ORDER BY id');
    console.log('Users:');
    rows.forEach(r => console.log(r));
    await conn.end();
  }catch(e){
    console.error('Error:', e && e.message || e);
    process.exit(1);
  }
})();
