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
    const [rows] = await conn.execute("SHOW COLUMNS FROM `user`");
    console.log('user columns:');
    rows.forEach(r => console.log('-', r.Field, r.Type, r.Null, r.Default));
    await conn.end();
  }catch(e){
    console.error('Error:', e && e.message || e);
    process.exit(1);
  }
})();
