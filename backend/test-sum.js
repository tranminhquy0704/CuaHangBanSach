const mysql = require('mysql2');
const db = mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'shopbansach' });
const sql = `SELECT id, total, CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2)) AS parsed FROM orders WHERE id IN (1825,1826)`;
db.query(sql, (err, rows) => {
  if (err) { console.error('ERR', err); process.exit(1); }
  console.log(rows);
  const sumSql = `SELECT IFNULL(SUM(CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))),0) AS sum FROM orders WHERE id IN (1825,1826)`;
  db.query(sumSql, (sErr, sRows) => {
    if (sErr) { console.error('SUM ERR', sErr); db.end(); process.exit(1); }
    console.log('SUM:', sRows && sRows[0] ? sRows[0].sum : null);
    db.end();
  });
});
