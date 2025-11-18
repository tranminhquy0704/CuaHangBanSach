require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  // default to the project database when DB_NAME isn't set
  database: process.env.DB_NAME || 'shopbansach',
});

// (moved seed-orders endpoint below after authenticateAdmin)
 


// (settings routes moved below authenticateAdmin)

// (moved stock adjust route below after authenticateAdmin)

// Admin: Products CRUD
// (moved Admin Products CRUD below after authenticateAdmin definition)

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to MySQL. DB:', (process.env.DB_NAME || 'shopbansach'));
  }
});

// JWT Admin Auth Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Extract user id from Authorization: Bearer <jwt> if role is user; returns null if not present/invalid
function getUserIdFromAuth(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (String(payload.role || '').toLowerCase() === 'user' && payload.id) {
      return Number(payload.id) || null;
    }
  } catch (_) { /* ignore */ }
  return null;
}

// JWT User Auth Middleware
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (String(payload.role || '').toLowerCase() !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Voucher helpers & auto-grant configuration
const AUTO_VOUCHERS = {
  signup: {
    code: 'WELCOME20K',
    name: 'Voucher chào mừng',
    description: 'Giảm 20.000 ₫ cho đơn hàng từ 150.000 ₫',
    discount_type: 'fixed',
    discount_value: 20000,
    min_order_amount: 150000,
    max_discount: null,
    quantity: null,
    auto_tag: 'signup',
  },
  first_order: {
    code: 'FIRSTORDER15K',
    name: 'Ưu đãi đơn đầu tiên',
    description: 'Giảm 15.000 ₫ khi hoàn tất đơn đầu tiên',
    discount_type: 'fixed',
    discount_value: 15000,
    min_order_amount: 100000,
    max_discount: null,
    quantity: null,
    auto_tag: 'first_order',
  },
  spend_500k: {
    code: 'BIGSPENDER50K',
    name: 'Tri ân khách chi tiêu 500K',
    description: 'Giảm 50.000 ₫ khi tổng chi tiêu đạt 500.000 ₫',
    discount_type: 'fixed',
    discount_value: 50000,
    min_order_amount: 200000,
    max_discount: null,
    quantity: null,
    auto_tag: 'spend_500k',
  },
  birthday: {
    code: 'BIRTHDAY40K',
    name: 'Quà sinh nhật',
    description: 'Giảm 40.000 ₫ nhân dịp sinh nhật (áp dụng đơn từ 200.000 ₫)',
    discount_type: 'fixed',
    discount_value: 40000,
    min_order_amount: 200000,
    max_discount: null,
    quantity: null,
    auto_tag: 'birthday',
  }
};

const CLEAN_TOTAL_SQL = "CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))";

function runSeries(tasks = [], done = () => {}) {
  const step = (idx = 0) => {
    if (idx >= tasks.length) return done();
    try {
      tasks[idx]((err) => {
        if (err) return done(err);
        step(idx + 1);
      });
    } catch (e) {
      done(e);
    }
  };
  step();
}

function sequenceQueries(queries, done) {
  const run = (idx = 0) => {
    if (idx >= queries.length) return done();
    const { sql, params = [] } = queries[idx];
    db.query(sql, params, (err) => {
      if (err) return done(err);
      run(idx + 1);
    });
  };
  run();
}

function ensureVouchersTable(cb) {
  const baseSql = `CREATE TABLE IF NOT EXISTS vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT NULL,
    description TEXT,
    discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount DECIMAL(12,2) DEFAULT NULL,
    quantity INT DEFAULT NULL,
    claimed_count INT DEFAULT 0,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    start_date DATETIME DEFAULT NULL,
    end_date DATETIME DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_tag VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;
  db.query(baseSql, (err) => {
    if (err) return cb(err);
    const alters = [
      { sql: 'ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS quantity INT DEFAULT NULL' },
      { sql: 'ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS claimed_count INT DEFAULT 0' },
      { sql: 'ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL' },
      { sql: 'ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS description TEXT' },
      { sql: 'ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS auto_tag VARCHAR(50) DEFAULT NULL' }
    ];
    sequenceQueries(alters, (alterErr) => {
      if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
        return cb(alterErr);
      }
      cb();
    });
  });
}

function ensureUserVouchersTable(cb) {
  const sql = `CREATE TABLE IF NOT EXISTS user_vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    voucher_id INT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME DEFAULT NULL,
    origin VARCHAR(50) DEFAULT NULL,
    UNIQUE KEY uniq_user_voucher (user_id, voucher_id),
    CONSTRAINT fk_uv_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT fk_uv_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
  )`;
  db.query(sql, (err) => {
    if (err) return cb(err);
    cb();
  });
}

function ensureVoucherInfra(cb) {
  ensureVouchersTable((err) => {
    if (err) return cb(err);
    ensureUserVouchersTable(cb);
  });
}

function normalizeVoucherRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value) || 0,
    min_order_amount: Number(row.min_order_amount) || 0,
    max_discount: row.max_discount !== null ? Number(row.max_discount) : null,
    quantity: row.quantity !== null ? Number(row.quantity) : null,
    claimed_count: Number(row.claimed_count || 0),
    usage_limit: row.usage_limit !== null ? Number(row.usage_limit) : null,
    used_count: Number(row.used_count || 0),
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: !!row.is_active,
    auto_tag: row.auto_tag || null
  };
}

function createOrUpdateVoucher(config, cb) {
  if (!config || !config.code) return cb(new Error('Invalid voucher config'));
  ensureVouchersTable((err) => {
    if (err) return cb(err);
    const sql = `INSERT INTO vouchers (code, name, description, discount_type, discount_value, min_order_amount, max_discount, quantity, auto_tag, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        discount_type = VALUES(discount_type),
        discount_value = VALUES(discount_value),
        min_order_amount = VALUES(min_order_amount),
        max_discount = VALUES(max_discount),
        quantity = VALUES(quantity),
        auto_tag = VALUES(auto_tag),
        is_active = TRUE`;
    const params = [
      config.code.toUpperCase(),
      config.name || null,
      config.description || null,
      config.discount_type || 'fixed',
      Number(config.discount_value) || 0,
      Number(config.min_order_amount) || 0,
      config.max_discount != null ? Number(config.max_discount) : null,
      config.quantity != null ? Number(config.quantity) : null,
      config.auto_tag || null
    ];
    db.query(sql, params, (upErr) => {
      if (upErr) return cb(upErr);
      db.query('SELECT * FROM vouchers WHERE code = ? LIMIT 1', [config.code.toUpperCase()], (selErr, rows) => {
        if (selErr) return cb(selErr);
        cb(null, normalizeVoucherRow(rows && rows[0]));
      });
    });
  });
}

function grantVoucherToUser(userId, voucherConfigOrId, origin, cb = () => {}) {
  if (!userId) return cb(new Error('userId required'));
  ensureVoucherInfra((err) => {
    if (err) return cb(err);
    const proceed = (voucher) => {
      if (!voucher) return cb(new Error('Voucher not found'));
      const insertSql = `INSERT INTO user_vouchers (user_id, voucher_id, origin)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE origin = VALUES(origin), received_at = received_at`;
      db.query(insertSql, [userId, voucher.id, origin || null], (insErr, result) => {
        if (insErr) return cb(insErr);
        const inserted = result && result.affectedRows === 1;
        if (inserted && voucher.quantity != null) {
          const updateSql = 'UPDATE vouchers SET claimed_count = claimed_count + 1 WHERE id = ?';
          db.query(updateSql, [voucher.id], () => cb(null, voucher, { inserted: true }));
          return;
        }
        cb(null, voucher, { inserted: inserted });
      });
    };
    if (typeof voucherConfigOrId === 'object' && voucherConfigOrId.code) {
      createOrUpdateVoucher(voucherConfigOrId, (cfgErr, voucher) => {
        if (cfgErr) return cb(cfgErr);
        proceed(voucher);
      });
    } else {
      const id = Number(voucherConfigOrId);
      if (!Number.isFinite(id)) return cb(new Error('Invalid voucher reference'));
      db.query('SELECT * FROM vouchers WHERE id = ? LIMIT 1', [id], (selErr, rows) => {
        if (selErr) return cb(selErr);
        proceed(normalizeVoucherRow(rows && rows[0]));
      });
    }
  });
}

function grantAutoVoucher(autoKey, userId, cb = () => {}) {
  if (!autoKey || !userId) return cb();
  const cfg = AUTO_VOUCHERS[autoKey];
  if (!cfg) return cb();
  grantVoucherToUser(userId, cfg, `auto-${autoKey}`, cb);
}

function ensureUserBirthdayColumn(cb) {
  const sql = 'ALTER TABLE `user` ADD COLUMN IF NOT EXISTS birthday DATE NULL';
  db.query(sql, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') return cb(err);
    cb();
  });
}

function checkAndGrantOrderVouchers(userId, cb = () => {}) {
  if (!userId) return cb();
  ensureVoucherInfra((err) => {
    if (err) return cb(err);
    const statsSql = `SELECT COUNT(*) AS total_orders, IFNULL(SUM(${CLEAN_TOTAL_SQL}),0) AS total_spent
      FROM orders WHERE user_id = ?`;
    db.query(statsSql, [userId], (statsErr, rows) => {
      if (statsErr) return cb(statsErr);
      const stats = rows && rows[0] ? rows[0] : { total_orders: 0, total_spent: 0 };
      const totalOrders = Number(stats.total_orders) || 0;
      const totalSpent = Number(stats.total_spent) || 0;
      const tasks = [];
      if (totalOrders === 1) {
        tasks.push((next) => grantAutoVoucher('first_order', userId, () => next()));
      }
      if (totalSpent >= 500000) {
        tasks.push((next) => grantAutoVoucher('spend_500k', userId, () => next()));
      }
      tasks.push((next) => {
        ensureUserBirthdayColumn((alterErr) => {
          if (alterErr) return next(alterErr);
          const birthdaySql = 'SELECT birthday FROM `user` WHERE id = ? LIMIT 1';
          db.query(birthdaySql, [userId], (bErr, bRows) => {
            if (bErr) return next(bErr);
            const birthday = bRows && bRows[0] ? bRows[0].birthday : null;
            if (!birthday) return next();
            const today = new Date();
            const bDate = new Date(birthday);
            if (today.getMonth() === bDate.getMonth() && today.getDate() === bDate.getDate()) {
              grantAutoVoucher('birthday', userId, () => next());
            } else {
              next();
            }
          });
        });
      });
      runSeries(tasks, cb);
    });
  });
}

function parseVNDValue(value) {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value).replace(/[^\d.-]/g, '');
  if (!str) return 0;
  return Number(str) || 0;
}

function calculateCartSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const unit = parseVNDValue(item?.price);
    const qty = Number(item?.quantity) || 1;
    return sum + unit * qty;
  }, 0);
}

function calculateVoucherDiscountAmount(voucher, subtotal) {
  if (!voucher || subtotal <= 0) return 0;
  const minAmount = Number(voucher.min_order_amount || 0);
  if (subtotal < minAmount) return 0;
  let discount = 0;
  if (voucher.discount_type === 'percent') {
    discount = Math.round(subtotal * (Number(voucher.discount_value) || 0) / 100);
    if (voucher.max_discount && discount > Number(voucher.max_discount)) {
      discount = Number(voucher.max_discount);
    }
  } else {
    discount = Number(voucher.discount_value) || 0;
  }
  if (discount < 0) discount = 0;
  if (discount > subtotal) discount = subtotal;
  return discount;
}

function ensureOrderVoucherColumns(cb) {
  const alters = [
    { sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50) NULL' },
    { sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0' },
    { sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_voucher_id INT NULL' }
  ];
  sequenceQueries(alters, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') return cb(err);
    cb();
  });
}
// Signup
app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
  }
  db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('SELECT error:', err.message);
      return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
    }
    if (results.length > 0) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    db.query('INSERT INTO user (email, password) VALUES (?, ?)', [email, hashed], (err, result) => {
      if (err) {
        console.error('INSERT error:', err.message);
        return res.status(500).json({ message: 'Lỗi lưu người dùng' });
      }
      const userId = result?.insertId;
      if (!userId) {
        return res.status(201).json({ message: 'Đăng ký thành công!' });
      }
      grantAutoVoucher('signup', userId, (grantErr) => {
        if (grantErr) {
          console.error('Auto voucher signup error:', grantErr);
        }
        res.status(201).json({
          message: 'Đăng ký thành công!',
          welcomeVoucher: grantErr ? false : true
        });
      });
    });
  });
});

// User login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
  }
  db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('SELECT error:', err.message);
      return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
    }
    if (results.length === 0) {
      return res.status(400).json({ message: 'Tên đăng nhập không đúng' });
    }
    const user = results[0];
    if (String(user.status||'active') === 'blocked') {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }
    const isHashed = typeof user.password === 'string' && user.password.startsWith('$2');
    const passwordOk = isHashed ? bcrypt.compareSync(password, user.password) : password === user.password;
    if (!passwordOk) return res.status(400).json({ message: 'Mật khẩu không đúng' });
    const role = String(user.role || 'user').toLowerCase();
    const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.status(200).json({ role, token });
  });
});

// Unified auth login: try admin first, then user
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
  }
  // Check admin
  db.query('SELECT * FROM admins WHERE email = ? LIMIT 1', [email], (aErr, aRows) => {
    if (aErr) {
      console.error('SELECT admins error:', aErr.message);
      return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
    }
    if (Array.isArray(aRows) && aRows.length > 0) {
      const admin = aRows[0];
      const isHashed = typeof admin.password === 'string' && admin.password.startsWith('$2');
      const passwordOk = isHashed ? bcrypt.compareSync(password, admin.password) : password === admin.password;
      if (!passwordOk) return res.status(400).json({ message: 'Mật khẩu không đúng' });
      const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
      return res.status(200).json({ role: 'admin', token });
    }
    // Fallback to normal user (respect role column if admin)
    db.query('SELECT * FROM user WHERE email = ? LIMIT 1', [email], (uErr, uRows) => {
      if (uErr) {
        console.error('SELECT user error:', uErr.message);
        return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
      }
      if (!Array.isArray(uRows) || uRows.length === 0) {
        return res.status(400).json({ message: 'Tên đăng nhập không đúng' });
      }
      const user = uRows[0];
      if (String(user.status||'active') === 'blocked') {
        return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
      }
      const isHashed = typeof user.password === 'string' && user.password.startsWith('$2');
      const passwordOk = isHashed ? bcrypt.compareSync(password, user.password) : password === user.password;
      if (!passwordOk) return res.status(400).json({ message: 'Mật khẩu không đúng' });
      const role = String(user.role || 'user').toLowerCase();
      const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
      return res.status(200).json({ role, token });
    });
  });
});

// Admin login
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
  }
  db.query('SELECT * FROM admins WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('SELECT error:', err.message);
      return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
    }
    if (results.length === 0) {
      return res.status(400).json({ message: 'Tên đăng nhập không đúng' });
    }
    const admin = results[0];
    const isHashed = typeof admin.password === 'string' && admin.password.startsWith('$2');
    const passwordOk = isHashed ? bcrypt.compareSync(password, admin.password) : password === admin.password;
    if (!passwordOk) return res.status(400).json({ message: 'Mật khẩu không đúng' });
    const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.status(200).json({ token });
  });
});

// Products routes
app.get('/api/products', (req, res) => {
  const searchQuery = (req.query.q || req.query.search || '').trim();
  
  console.log('[API Products] Search query:', searchQuery, 'Full query:', req.query);
  
  // Check inventory settings
  db.query('SELECT value FROM settings WHERE `key` = ?', ['inventory.auto_hide'], (invErr, invRows) => {
    const autoHide = !invErr && invRows && invRows.length > 0 && invRows[0].value === 'true';
    
    // Nếu có query string search, tìm kiếm theo tên sản phẩm, nhà xuất bản, tác giả
    if (searchQuery && searchQuery.length > 0) {
    const searchTerm = `%${searchQuery}%`;
    const alter1 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id INT NULL';
    const alter2 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS publisher_id INT NULL';
    const alter3 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS author_id INT NULL';
    
    db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => {
      let sql = `SELECT DISTINCT p.* 
        FROM product p 
        LEFT JOIN category c ON p.category_id = c.id 
        LEFT JOIN party pub ON p.publisher_id = pub.id AND pub.type = 'publisher'
        LEFT JOIN party auth ON p.author_id = auth.id AND auth.type = 'author'
        WHERE (p.name LIKE ? COLLATE utf8mb4_unicode_ci
           OR (pub.name IS NOT NULL AND pub.name LIKE ? COLLATE utf8mb4_unicode_ci)
           OR (auth.name IS NOT NULL AND auth.name LIKE ? COLLATE utf8mb4_unicode_ci)
           OR (c.name IS NOT NULL AND c.name LIKE ? COLLATE utf8mb4_unicode_ci))`;
      
      // Filter out of stock if auto_hide is enabled
      if (autoHide) {
        sql += ` AND (p.stock IS NULL OR p.stock > 0)`;
      }
      
      sql += ` ORDER BY p.id DESC`;
      
      console.log('[API Products] Executing search SQL with term:', searchTerm);
      db.query(sql, [searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
        if (err) {
          console.error('Error searching products:', err);
          res.status(500).json({ message: 'Internal server error' });
          return;
        }
        console.log('[API Products] Search results count:', results?.length || 0, 'for query:', searchQuery);
        res.json(results || []);
      });
    })));
  } else {
    // Nếu không có search, lấy tất cả sản phẩm
    console.log('[API Products] No search query, returning all products');
    let query = 'SELECT * FROM product';
    
    // Filter out of stock if auto_hide is enabled
    if (autoHide) {
      query += ' WHERE (stock IS NULL OR stock > 0)';
    }
    
    query += ' ORDER BY id DESC';
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
      }
      res.json(results || []);
    });
  }
  });
});

app.get('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const query = 'SELECT * FROM product WHERE id = ?';
  db.query(query, [productId], (err, results) => {
    if (err) {
      console.error('Error fetching product:', err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.json(results[0]);
    }
  });
});

app.post('/admin/products', authenticateAdmin, (req, res) => {
  const { name, price, description, img, rating, sold, sale_total, sale_sold } = req.body;
  if (!name || !price || !description || !img) {
    return res.status(400).json({ message: 'Missing product data' });
  }
  // Defaults for optional fields
  const ratingVal = typeof rating === 'number' ? rating : 4.5;
  const soldVal = Number.isInteger(sold) ? sold : 0;
  const saleTotalVal = Number.isInteger(sale_total) ? sale_total : 0;
  const saleSoldVal = Number.isInteger(sale_sold) ? sale_sold : 0;
  const query = 'INSERT INTO product (name, price, description, img, rating, sold, sale_total, sale_sold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [name, price, description, img, ratingVal, soldVal, saleTotalVal, saleSoldVal], (err, results) => {
    if (err) {
      console.error('Error adding product:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(201).json({ message: 'Product added successfully', id: results.insertId });
  });
});

app.put('/admin/products/:id', authenticateAdmin, (req, res) => {
  const productId = req.params.id;
  const { name, price, description, img, rating, sold, sale_total, sale_sold } = req.body;
  if (!name || !price || !description || !img) {
    return res.status(400).json({ message: 'Missing product data' });
  }
  const ratingVal = typeof rating === 'number' ? rating : 4.5;
  const soldVal = Number.isInteger(sold) ? sold : 0;
  const saleTotalVal = Number.isInteger(sale_total) ? sale_total : 0;
  const saleSoldVal = Number.isInteger(sale_sold) ? sale_sold : 0;
  const query = 'UPDATE product SET name = ?, price = ?, description = ?, img = ?, rating = ?, sold = ?, sale_total = ?, sale_sold = ? WHERE id = ?';
  db.query(query, [name, price, description, img, ratingVal, soldVal, saleTotalVal, saleSoldVal, productId], (err) => {
    if (err) {
      console.error('Error updating product:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json({ message: 'Product updated successfully' });
  });
});

app.delete('/admin/products/:id', authenticateAdmin, (req, res) => {
  const productId = req.params.id;
  const query = 'DELETE FROM product WHERE id = ?';
  db.query(query, [productId], (err) => {
    if (err) {
      console.error('Error deleting product:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  });
});

// Rate a product (minimal implementation)
app.post('/api/products/:id/rating', (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const stars = Number(req.body?.stars);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ message: 'stars must be 1..5' });
  }
  // Read current rating and rating_count; if rating_count column is missing, return error hint
  db.query('SELECT rating, rating_count FROM product WHERE id = ?', [productId], (err, rows) => {
    if (err) {
      console.error('SELECT rating error:', err);
      // Likely missing rating_count column
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const cur = rows[0];
    const count = Number(cur.rating_count) || 0;
    const currentRating = Number(cur.rating) || 0;
    const newCount = count + 1;
    const newRating = Math.max(0, Math.min(5, (currentRating * count + stars) / newCount));
    db.query('UPDATE product SET rating = ?, rating_count = ? WHERE id = ?', [newRating, newCount, productId], (uErr) => {
      if (uErr) {
        console.error('UPDATE rating error:', uErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json({ id: productId, rating: newRating, rating_count: newCount });
    });
  });
});

// Orders
app.post('/api/orders', (req, res) => {
  const { fullName, mobile, address, state, paymentMethod, total, cartItems, voucherCode, userVoucherId } = req.body;
  const missingRequired =
    !fullName || String(fullName).trim() === '' ||
    !mobile || String(mobile).trim() === '' ||
    !address || String(address).trim() === '' ||
    !state || String(state).trim() === '' ||
    !paymentMethod ||
    total === undefined || total === null ||
    !Array.isArray(cartItems) || cartItems.length === 0;
  if (missingRequired) {
    return res.status(400).json({ message: 'Thiếu thông tin đặt hàng.' });
  }
  const userId = getUserIdFromAuth(req);
  const normalizedItems = Array.isArray(cartItems) ? cartItems : [];
  const subtotal = calculateCartSubtotal(normalizedItems);
  const normalizedVoucherCode = typeof voucherCode === 'string' ? voucherCode.trim().toUpperCase() : '';
  const normalizedUserVoucherId = userVoucherId ? Number(userVoucherId) : null;
  const safeTotal = Math.max(0, Number(total) || 0);

  const finalizeOrder = (voucherContext = {}) => {
    ensureOrderVoucherColumns(() => {
      const insertSql = `INSERT INTO orders 
        (fullName, mobile, address, state, paymentMethod, total, cartItems, user_id, status, voucher_code, discount_amount, user_voucher_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(
        insertSql,
        [
          fullName,
          mobile,
          address,
          state,
          paymentMethod,
          safeTotal,
          JSON.stringify(normalizedItems),
          userId,
          'pending',
          voucherContext.code || null,
          voucherContext.discount || 0,
          voucherContext.userVoucherId || null
        ],
        (err, result) => {
          if (err) {
            console.error('Error inserting order:', err);
            return res.status(500).json({ message: 'Lỗi khi lưu đơn hàng.' });
          }
          const orderId = result?.insertId;
          console.log(`[Create Order] Order created: ID=${orderId}, user_id=${userId}, total=${safeTotal}`);

          const afterOrderTasks = [];
          if (voucherContext.voucherId) {
            afterOrderTasks.push((next) => {
              db.query('UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?', [voucherContext.voucherId], () => next());
            });
          }
          if (voucherContext.userVoucherId) {
            afterOrderTasks.push((next) => {
              db.query('UPDATE user_vouchers SET is_used = TRUE, used_at = NOW() WHERE id = ?', [voucherContext.userVoucherId], () => next());
            });
          }
          if (userId) {
            afterOrderTasks.push((next) => checkAndGrantOrderVouchers(userId, () => next()));
          }
          runSeries(afterOrderTasks, () => {});

          let parseItems = [];
          try {
            parseItems = normalizedItems;
          } catch (_) { parseItems = []; }
          const updates = parseItems
            .map(it => ({ id: Number(it.id), qty: Number(it.quantity) || 1 }))
            .filter(it => Number.isFinite(it.id) && it.id > 0 && Number.isFinite(it.qty) && it.qty > 0);

          if (updates.length === 0) {
            return res.status(201).json({ message: 'Đơn hàng đã được đặt thành công.' });
          }

          let done = 0, failed = false, updatedSold = 0;
          updates.forEach(u => {
            const sql = 'UPDATE product SET sold = sold + ?, sale_sold = sale_sold + ? WHERE id = ?';
            db.query(sql, [u.qty, u.qty, u.id], (uErr, result) => {
              if (uErr) {
                console.error('Error updating product sold:', uErr);
                failed = true;
              }
              if (!uErr && result && typeof result.affectedRows === 'number') {
                updatedSold += result.affectedRows;
              }
              done++;
              if (done === updates.length) {
                const baseResponse = { message: failed ? 'Đơn hàng đã được đặt, nhưng cập nhật số lượng bán có lỗi một phần.' : 'Đơn hàng đã được đặt thành công.' };
                if (updatedSold) baseResponse.updatedSold = updatedSold;
                if (voucherContext.code) {
                  baseResponse.appliedVoucher = {
                    code: voucherContext.code,
                    discount: voucherContext.discount
                  };
                }
                return res.status(201).json(baseResponse);
              }
            });
          });
        }
      );
    });
  };

  const handleVoucher = () => {
    if (!normalizedVoucherCode && !normalizedUserVoucherId) {
      return finalizeOrder();
    }
    ensureVoucherInfra((err) => {
      if (err) {
        console.error('Ensure voucher infra error:', err);
        return res.status(500).json({ message: 'Không thể áp dụng voucher lúc này' });
      }
      if (normalizedUserVoucherId && !userId) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập để sử dụng voucher đã lưu' });
      }
      const onVoucherLoaded = (voucherRow, userVoucherRow) => {
        const voucher = normalizeVoucherRow(voucherRow);
        if (!voucher || !voucher.is_active) {
          return res.status(400).json({ message: 'Voucher không khả dụng' });
        }
        const now = new Date();
        if (voucher.start_date && new Date(voucher.start_date) > now) {
          return res.status(400).json({ message: 'Voucher chưa bắt đầu' });
        }
        if (voucher.end_date && new Date(voucher.end_date) < now) {
          return res.status(400).json({ message: 'Voucher đã hết hạn' });
        }
        const discount = calculateVoucherDiscountAmount(voucher, subtotal);
        if (discount <= 0) {
          return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${voucher.min_order_amount ? `${voucher.min_order_amount} ₫` : ''} để dùng voucher này` });
        }
        const context = {
          code: voucher.code,
          discount,
          voucherId: voucher.id,
          userVoucherId: userVoucherRow ? userVoucherRow.id : null
        };
        finalizeOrder(context);
      };

      if (normalizedUserVoucherId) {
        const sql = 'SELECT * FROM user_vouchers WHERE id = ? LIMIT 1';
        db.query(sql, [normalizedUserVoucherId], (uvErr, uvRows) => {
          if (uvErr) {
            console.error('Fetch user voucher error:', uvErr);
            return res.status(500).json({ message: 'Không thể áp dụng voucher đã lưu' });
          }
          if (!uvRows || uvRows.length === 0) {
            return res.status(404).json({ message: 'Voucher đã lưu không tồn tại' });
          }
          const userVoucher = uvRows[0];
          if (userVoucher.user_id !== userId) {
            return res.status(403).json({ message: 'Voucher này không thuộc tài khoản của bạn' });
          }
          if (userVoucher.is_used) {
            return res.status(400).json({ message: 'Voucher này đã được sử dụng' });
          }
          db.query('SELECT * FROM vouchers WHERE id = ? LIMIT 1', [userVoucher.voucher_id], (vErr, vRows) => {
            if (vErr) {
              console.error('Load voucher error:', vErr);
              return res.status(500).json({ message: 'Không thể áp dụng voucher' });
            }
            if (!vRows || vRows.length === 0) {
              return res.status(404).json({ message: 'Voucher không tồn tại' });
            }
            onVoucherLoaded(vRows[0], userVoucher);
          });
        });
      } else if (normalizedVoucherCode) {
        db.query('SELECT * FROM vouchers WHERE code = ? LIMIT 1', [normalizedVoucherCode], (vErr, vRows) => {
          if (vErr) {
            console.error('Load voucher error:', vErr);
            return res.status(500).json({ message: 'Không thể áp dụng voucher' });
          }
          if (!vRows || vRows.length === 0) {
            return res.status(404).json({ message: 'Voucher không tồn tại' });
          }
          onVoucherLoaded(vRows[0], null);
        });
      } else {
        finalizeOrder();
      }
    });
  };

  console.log(`[Create Order] userId from auth: ${userId}, fullName: ${fullName}, cartItems count: ${normalizedItems.length}`);
  handleVoucher();
});

// User: Get my orders
app.get('/api/my-orders', authenticateUser, (req, res) => {
  const userId = req.user.id;
  const sql = `SELECT id, fullName, mobile, address, state, paymentMethod, total, status, created_at, cartItems, user_id,
    voucher_code, discount_amount, user_voucher_id
    FROM orders
    WHERE user_id = ?
    ORDER BY id DESC`;
  
  db.query(sql, [userId], (err, orders) => {
    if (err) {
      console.error('Error fetching user orders:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    // Parse cartItems from JSON string to object
    if (orders && Array.isArray(orders)) {
      orders.forEach((order) => {
        if (order.cartItems) {
          try {
            order.cartItems = JSON.parse(order.cartItems);
          } catch (e) {
            console.error('Error parsing cartItems for order', order.id, ':', e);
            order.cartItems = [];
          }
        } else {
          order.cartItems = [];
        }
      });
    }
    
    res.json(orders || []);
  });
});

// User: Get my order detail
app.get('/api/my-orders/:id', authenticateUser, (req, res) => {
  const userId = req.user.id;
  const orderId = Number(req.params.id);
  
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }
  
  const sql = `SELECT id, fullName, mobile, address, state, paymentMethod, total, status, created_at, cartItems, user_id,
    voucher_code, discount_amount, user_voucher_id
    FROM orders
    WHERE id = ? AND user_id = ?
    LIMIT 1`;
  
  db.query(sql, [orderId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching order detail:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = results[0];
    
    // Parse cartItems from JSON string to object
    if (order.cartItems) {
      try {
        order.cartItems = JSON.parse(order.cartItems);
      } catch (e) {
        console.error('Error parsing cartItems for order', order.id, ':', e);
        order.cartItems = [];
      }
    } else {
      order.cartItems = [];
    }
    
    res.json(order);
  });
});

app.get('/api/orders', authenticateAdmin, (req, res) => {
  const query = 'SELECT * FROM orders';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
    results.forEach((order) => {
      order.cartItems = JSON.parse(order.cartItems);
    });
    res.json(results);
  });
});

// Serve SB Admin static template at /admin
const adminDistPath = require('path').resolve(__dirname, '..', 'startbootstrap-sb-admin-master', 'dist');
app.use('/admin', express.static(adminDistPath));
app.get('/admin', (req, res) => {
  res.sendFile(require('path').join(adminDistPath, 'index.html'));
});

// Admin Dashboard: Metrics cards
app.get('/admin/metrics', authenticateAdmin, (req, res) => {
  const total_num = "CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))";
  const sql = `
    SELECT
      IFNULL(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN ${total_num} END), 0) AS revenueToday,
      IFNULL(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN ${total_num} END), 0) AS revenueThisMonth,
      COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS newOrders
    FROM orders;
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Metrics orders error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const ordersAgg = rows && rows[0] ? rows[0] : { revenueToday: 0, revenueThisMonth: 0, newOrders: 0 };
    const lowStockSql = 'SELECT COUNT(*) AS c FROM product WHERE stock <= 5';
    db.query(lowStockSql, (e2, r2) => {
      if (e2) {
        console.error('Metrics stock error:', e2);
        return res.status(500).json({ message: 'Internal server error' });
      }
      const lowStockCount = r2 && r2[0] ? r2[0].c : 0;
      const newCustomersSql = 'SELECT COUNT(*) AS c FROM user WHERE DATE(created_at) = CURDATE()';
      db.query(newCustomersSql, (e3, r3) => {
        if (e3) {
          console.error('Metrics users error:', e3);
          return res.status(500).json({ message: 'Internal server error' });
        }
        const newCustomers = r3 && r3[0] ? r3[0].c : 0;
        res.json({
          revenueToday: Number(ordersAgg.revenueToday) || 0,
          revenueThisMonth: Number(ordersAgg.revenueThisMonth) || 0,
          newOrders: Number(ordersAgg.newOrders) || 0,
          lowStockCount: Number(lowStockCount) || 0,
          newCustomers: Number(newCustomers) || 0,
        });
      });
    });
  });
});

// Admin Dashboard: Revenue by month
app.get('/admin/charts/revenue-by-month', authenticateAdmin, (req, res) => {
  const year = Number(req.query.year) || null;
  const whereYear = year ? 'YEAR(created_at) = ?' : 'YEAR(created_at) = YEAR(CURDATE())';
  const total_num = "CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))";
  const sql = `
    SELECT MONTH(created_at) AS m, IFNULL(SUM(${total_num}),0) AS sum
    FROM orders
    WHERE ${whereYear}
    GROUP BY MONTH(created_at)
    ORDER BY MONTH(created_at);
  `;
  db.query(sql, year? [year] : [], (err, rows) => {
    if (err) {
      console.error('Revenue by month error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    let data = Array.from({ length: 12 }, (_, i) => {
      const row = (rows||[]).find(r => Number(r.m) === i + 1);
      return Number(row?.sum) || 0;
    });
    // Optional demo data: if ?demo=1, synthesize realistic-like values when zeros
    if (String(req.query.demo||'') === '1'){
      const max = Math.max(...data);
      const allZero = !data.some(v => v>0);
      if (allZero){
        // Generate a smooth seasonal curve
        const base = 1500000; // 1.5M
        data = data.map((_,i)=> Math.round(base * (0.7 + 0.6*Math.sin((i/12)*Math.PI*2)) + Math.random()*200000));
      } else {
        // Fill zeros with small noise around average
        const avg = (data.reduce((a,b)=>a+b,0)/(data.filter(v=>v>0).length||1))||0;
        data = data.map(v=> v>0? v : Math.round(avg*0.5 + Math.random()*avg*0.5));
      }
    }
    res.json({ months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], data });
  });
});

// Admin Dashboard: Revenue by last 12 ISO weeks
app.get('/admin/charts/revenue-by-week', authenticateAdmin, (req, res) => {
  const sql = `
    SELECT YEARWEEK(created_at, 1) AS yw, IFNULL(SUM(total),0) AS sum
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 84 DAY) -- ~12 weeks
    GROUP BY YEARWEEK(created_at,1)
    ORDER BY YEARWEEK(created_at,1);
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Revenue by week error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    // Build last 12 ISO weeks keys
    const result = [];
    const now = new Date();
    for (let i=11;i>=0;i--){
      const d = new Date(now);
      d.setDate(d.getDate() - i*7);
      // Format YEARWEEK ISO (approx): year*100 + weekNo
      const onejan = new Date(d.getFullYear(),0,1);
      const day = Math.floor((d - onejan)/86400000) + onejan.getDay();
      const week = Math.ceil((day)/7);
      result.push({ key: d.getFullYear()*100 + week, sum: 0 });
    }
    const map = new Map((rows||[]).map(r => [Number(r.yw), Number(r.sum)||0]));
    const data = result.map(r => map.get(r.key) || 0);
    let final = data;
    if (String(req.query.demo||'') === '1'){
      const allZero = !data.some(v=>v>0);
      if (allZero){
        const base = 300000; // 0.3M per week baseline
        final = data.map((_,i)=> Math.round(base * (0.7 + 0.5*Math.sin((i/12)*Math.PI*2)) + Math.random()*60000));
      }
    }
    res.json({ weeks: Array.from({length:12}, (_,i)=> i+1), data: final });
  });
});

// Admin Dashboard: Revenue by category (name keyword based)
app.get('/admin/charts/revenue-by-category', authenticateAdmin, (req, res) => {
  const sql = 'SELECT name, price, sold FROM product';
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Revenue by category error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const agg = { 'Fiction': 0, 'Non-Fiction': 0, 'Science': 0 };
    rows.forEach(p => {
      const name = String(p.name || '').toLowerCase();
      const revenue = (Number(p.price) || 0) * (Number(p.sold) || 0);
      let cat = 'Non-Fiction';
      if (/(khoa học|science|vật lý|hóa|sinh)/.test(name)) cat = 'Science';
      if (/(tiểu thuyết|novel|truyện|fiction)/.test(name)) cat = 'Fiction';
      agg[cat] += revenue;
    });
    res.json({ labels: Object.keys(agg), data: Object.values(agg) });
  });
});

// Admin Dashboard: Best sellers
app.get('/admin/top/best-sellers', authenticateAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5));
  const sql = 'SELECT id, name, price, sold, stock, img FROM product ORDER BY sold DESC LIMIT ?';
  db.query(sql, [limit], (err, rows) => {
    if (err) {
      console.error('Best sellers error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(rows);
  });
});

// Admin Dashboard: Recent orders
app.get('/admin/orders/recent', authenticateAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
  // Order by auto-increment id to reflect newest inserts first, avoiding future-dated demo orders masking new ones
  // `email` column is being removed; do not select it here.
  const sql = 'SELECT id, fullName, total, status, created_at, user_id FROM orders ORDER BY id DESC LIMIT ?';
  db.query(sql, [limit], (err, rows) => {
    if (err) {
      console.error('Recent orders error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(rows);
  });
});
// Admin Dashboard: Customers count
app.get('/admin/customers/count', authenticateAdmin, (req, res) => {
  const sql = 'SELECT COUNT(*) AS total FROM `user`';
  db.query(sql, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ total: rows[0].total });
  });
});


// Admin Dashboard: Revenue aggregated by period
app.get('/admin/charts/revenue', authenticateAdmin, (req, res) => {
const by = (req.query.by || 'month').toLowerCase();
let labelExpr;
let displayLabelExpr = null;
if (by === 'day') {
  // Cho biểu đồ ngày: lấy doanh thu theo từng ngày, format label dễ đọc hơn
  labelExpr = 'DATE(created_at)';
  displayLabelExpr = "DATE_FORMAT(created_at, '%d/%m/%Y')";
} else if (by === 'year') {
  labelExpr = 'YEAR(created_at)';
  displayLabelExpr = 'YEAR(created_at)';
} else {
  labelExpr = "DATE_FORMAT(created_at, '%Y-%m')";
  displayLabelExpr = labelExpr;
}
const total_num = "CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))";
const sql = `SELECT ${labelExpr} AS label, ${displayLabelExpr || labelExpr} AS display_label, SUM(${total_num}) AS revenue 
  FROM orders 
  WHERE created_at IS NOT NULL
  GROUP BY ${labelExpr}
  ORDER BY ${labelExpr} DESC
  LIMIT 30`;
db.query(sql, (err, rows) => {
if (err) {
console.error('Revenue chart error:', err);
return res.status(500).json({ message: 'Internal server error' });
}
// Dùng display_label nếu có, nếu không dùng label
const labels = (rows || []).map(r => String(r.display_label || r.label || ''));
const data = (rows || []).map(r => Number(r.revenue) || 0);
// Đảo ngược để hiển thị từ cũ đến mới (trái sang phải)
res.json({ by, labels: labels.reverse(), data: data.reverse() });
});
});

// Admin: Customers list
app.get('/admin/customers/list', authenticateAdmin, (req, res) => {
const alter = "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'";
db.query(alter, () => {
  const sql = 'SELECT id, email, created_at, status FROM `user` ORDER BY created_at DESC';
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Customers list error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(rows || []);
  });
});
});

// Admin: Customer detail with orders and total spent
app.get('/admin/customers/:id/detail', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });
  const userSql = 'SELECT id, email, created_at, status FROM `user` WHERE id = ? LIMIT 1';
  db.query(userSql, [id], (uErr, uRows) => {
    if (uErr) { console.error('Customer detail user error:', uErr); return res.status(500).json({ message: 'Internal server error' }); }
    if (!uRows || uRows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = uRows[0];
  const total_num = "CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))";
    // Include orders linked by user_id only. The `email` field previously present on orders
    // is being removed; do not rely on it for matching.
    const ordersSql = `SELECT id, fullName, total, status, created_at, cartItems, user_id
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC`;
    const sumSql = `SELECT IFNULL(SUM(${total_num}),0) AS sum FROM orders
      WHERE user_id = ?`;
    db.query(ordersSql, [id], (oErr, orders) => {
      if (oErr) { console.error('Customer detail orders error:', oErr); return res.status(500).json({ message: 'Internal server error' }); }
      console.log(`[Customer Detail] User ${id} (${user.email}) - Found ${orders?.length || 0} orders with user_id=${id}`);
      // Parse cartItems from JSON string to object
      if (orders && Array.isArray(orders)) {
        orders.forEach((order) => {
          if (order.cartItems) {
            try {
              const parsed = JSON.parse(order.cartItems);
              console.log(`[Admin Customer Detail] Order ${order.id} - cartItems raw length:`, order.cartItems?.length);
              console.log(`[Admin Customer Detail] Order ${order.id} - cartItems parsed:`, parsed);
              console.log(`[Admin Customer Detail] Order ${order.id} - cartItems is array:`, Array.isArray(parsed));
              if (Array.isArray(parsed)) {
                console.log(`[Admin Customer Detail] Order ${order.id} - cartItems array length:`, parsed.length);
                parsed.forEach((item, idx) => {
                  console.log(`[Admin Customer Detail] Order ${order.id} - Item ${idx}:`, item);
                });
              }
              order.cartItems = parsed;
            } catch (e) {
              console.error('Error parsing cartItems for order', order.id, ':', e);
              order.cartItems = [];
            }
          } else {
            order.cartItems = [];
          }
        });
      }
      db.query(sumSql, [id], (sErr, sRows) => {
        if (sErr) { console.error('Customer detail sum error:', sErr); return res.status(500).json({ message: 'Internal server error' }); }
        const totalSpent = sRows && sRows[0] ? Number(sRows[0].sum) || 0 : 0;
        res.json({ user, orders: orders || [], totalSpent });
      });
    });
  });
});

// Admin: Orders by arbitrary email (for loose coupling when orders have no user_id)
app.get('/admin/orders/by-email', authenticateAdmin, (req, res) => {
  // The orders.email column has been removed/disabled. This endpoint is no longer supported.
  return res.status(410).json({ message: 'This endpoint is deprecated: orders do not store a shipping email anymore. Use /admin/customers/:id/related-orders to search by other fields.' });
});

// Admin: Related orders for a customer (looser search)
// This endpoint is a safe, read-only helper that attempts to find orders that may belong
// to the given user based on multiple textual fields (email, cartItems, address, mobile).
// It does NOT modify any data; use it to review candidate orders before deciding to attach them.
app.get('/admin/customers/:id/related-orders', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });
  const userSql = 'SELECT id, email FROM `user` WHERE id = ? LIMIT 1';
  db.query(userSql, [id], (uErr, uRows) => {
    if (uErr) { console.error('Related orders user error:', uErr); return res.status(500).json({ message: 'Internal server error' }); }
    if (!uRows || uRows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = uRows[0];
    const total_num = "CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(total,'₫',''),' đ',''),'đ',''),',',''),' ','') AS DECIMAL(14,2))";
    
    // Get orders for this user (by user_id) + all unassigned orders as candidates
    const sql = `
      SELECT id, fullName, total, status, created_at, user_id, cartItems FROM orders
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY id DESC
      LIMIT 150
    `;
    const params = [id];
    db.query(sql, params, (oErr, orders) => {
      if (oErr) { console.error('Related orders query error:', oErr); return res.status(500).json({ message: 'Internal server error' }); }
      
      // Parse cartItems from JSON string to object
      if (orders && Array.isArray(orders)) {
        orders.forEach((order) => {
          if (order.cartItems) {
            try {
              order.cartItems = JSON.parse(order.cartItems);
            } catch (e) {
              console.error('Error parsing cartItems for order', order.id, ':', e);
              order.cartItems = [];
            }
          } else {
            order.cartItems = [];
          }
        });
      }
      
      // Calculate sum for assigned orders only
      const sumSql = `SELECT IFNULL(SUM(${total_num}),0) AS sum FROM orders WHERE user_id = ?`;
      db.query(sumSql, [id], (sErr, sRows) => {
        if (sErr) { console.error('Related orders sum error:', sErr); return res.status(500).json({ message: 'Internal server error' }); }
        const totalSpent = sRows && sRows[0] ? Number(sRows[0].sum) || 0 : 0;
        res.json({ user, orders: orders || [], totalSpent });
      });
    });
  });
});

  // Admin: attach an order to a user (adds user_id column if missing)
  app.patch('/admin/orders/:orderId/attach-user', authenticateAdmin, (req, res) => {
    const orderId = Number(req.params.orderId);
    const userId = Number(req.body?.userId);
    if (!Number.isFinite(orderId) || orderId <= 0) return res.status(400).json({ message: 'Invalid order id' });
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ message: 'Invalid user id' });
    // Ensure column exists (safe on MySQL 8+)
    const alter = 'ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `user_id` INT NULL';
    db.query(alter, (aErr) => {
      if (aErr) { console.error('Attach: alter orders error', aErr); return res.status(500).json({ message: 'Internal server error' }); }
      const sql = 'UPDATE orders SET user_id = ? WHERE id = ?';
      db.query(sql, [userId, orderId], (uErr, result) => {
        if (uErr) { console.error('Attach: update error', uErr); return res.status(500).json({ message: 'Internal server error' }); }
        return res.json({ orderId, userId, affectedRows: result && result.affectedRows ? result.affectedRows : 0 });
      });
    });
  });

// Admin: Update user status active|blocked
app.patch('/admin/users/:id/status', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '').toLowerCase();
  if (!['active','blocked'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const sql = 'UPDATE `user` SET status = ? WHERE id = ?';
  db.query(sql, [status, id], (err) => {
    if (err) { console.error('Change status error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, status });
  });
});

// Admin: Reset user password (returns a temporary password)
app.post('/admin/users/:id/reset-password', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const temp = Math.random().toString(36).slice(-10);
  const hashed = bcrypt.hashSync(temp, 10);
  const sql = 'UPDATE `user` SET password = ? WHERE id = ?';
  db.query(sql, [hashed, id], (err) => {
    if (err) { console.error('Reset password error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, tempPassword: temp });
  });
});

// Admin: Seed demo-like REAL orders across 12 months for a year
// POST /admin/demo/seed-orders  { year?: number, perMonthMin?: number, perMonthMax?: number }
app.post('/admin/demo/seed-orders', authenticateAdmin, (req, res) => {
  const year = Number(req.body?.year) || new Date().getFullYear();
  const perMin = Math.max(1, Number(req.body?.perMonthMin) || 3);
  const perMax = Math.max(perMin, Number(req.body?.perMonthMax) || 8);

  db.query('SELECT id, name, price FROM product', (pErr, products) => {
    if (pErr) { console.error('Seed: load products error', pErr); return res.status(500).json({ message: 'Load products failed' }); }
    if (!products || products.length === 0) return res.status(400).json({ message: 'No products to create orders' });

    const rnd = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
    const pad2 = n=> String(n).padStart(2,'0');

    const monthJobs = [];
    for(let m=1;m<=12;m++){
      const count = rnd(perMin, perMax);
      // Add light seasonal factor per month to make curve up/down
      const season = 0.8 + 0.4 * Math.sin((m/12)*Math.PI*2);
      for(let k=0;k<count;k++){
        const day = rnd(1, 28);
        const hh = pad2(rnd(9,20));
        const mi = pad2(rnd(0,59));
        const ss = pad2(rnd(0,59));
        const ts = `${year}-${pad2(m)}-${pad2(day)} ${hh}:${mi}:${ss}`;
        const itemsCount = rnd(1, Math.min(4, products.length));
        const picked = [];
        const used = new Set();
        for(let i=0;i<itemsCount;i++){
          let idx = rnd(0, products.length-1);
          while(used.has(idx)) idx = rnd(0, products.length-1);
          used.add(idx);
          const qty = rnd(1, 3);
          // fallback price if product price is 0
          const basePrice = Number(products[idx].price) || rnd(50000, 200000);
          picked.push({ id: products[idx].id, quantity: qty, price: basePrice, name: products[idx].name });
        }
        let total = picked.reduce((s,it)=> s + it.price * it.quantity, 0);
        total = Math.round(total * season);
        const cartItemsStr = JSON.stringify(picked);
        monthJobs.push({ ts, total, cartItemsStr, picked });
      }
    }

    let inserted = 0;
    const soldMap = new Map();
    const doOne = (idx) => {
      if (idx >= monthJobs.length){
        if (soldMap.size === 0) return res.json({ inserted });
        const entries = Array.from(soldMap.entries());
        let done = 0;
        entries.forEach(([pid, qty]) => {
          db.query('UPDATE product SET sold = sold + ? WHERE id = ?', [qty, pid], (uErr)=>{
            if (uErr) console.error('Seed: update sold error', uErr);
            done++;
            if (done === entries.length){
              return res.json({ inserted });
            }
          });
        });
        return;
      }
      const job = monthJobs[idx];
      // Insert with created_at explicitly to avoid ON UPDATE CURRENT_TIMESTAMP overriding later
      const insertSql = 'INSERT INTO orders (fullName, email, mobile, address, state, paymentMethod, total, cartItems, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)';
      const vals = ['Demo User','demo@example.com','0123456789','HCMC, VN','completed','cod', Math.round(job.total), job.cartItemsStr, 'completed', job.ts];
      db.query(insertSql, vals, (iErr, result) => {
        if (iErr) { console.error('Seed: insert order error', iErr); return doOne(idx+1); }
        inserted++;
        job.picked.forEach(it => { soldMap.set(it.id, (soldMap.get(it.id)||0) + Number(it.quantity||0)); });
        doOne(idx+1);
      });
    };
    doOne(0);
  });
});

// Admin: Reset all orders then seed across 12 months for a year (one-shot)
// POST /admin/demo/reset-and-seed  { year?: number, perMonthMin?: number, perMonthMax?: number }
app.post('/admin/demo/reset-and-seed', authenticateAdmin, (req, res) => {
  const year = Number(req.body?.year) || new Date().getFullYear();
  const perMin = Math.max(1, Number(req.body?.perMonthMin) || 8);
  const perMax = Math.max(perMin, Number(req.body?.perMonthMax) || 15);

  // 1) Delete all orders
  db.query('DELETE FROM orders', (delErr) => {
    if (delErr) {
      console.error('Reset-and-seed: delete orders error', delErr);
      return res.status(500).json({ message: 'Delete orders failed' });
    }
    // 2) Reset product.sold
    db.query('UPDATE product SET sold = 0', (resetErr) => {
      if (resetErr) {
        console.error('Reset-and-seed: reset product.sold error', resetErr);
        return res.status(500).json({ message: 'Reset product sold failed' });
      }
      // 3) Load products and seed again using same approach as seed-orders
      db.query('SELECT id, name, price FROM product', (pErr, products) => {
        if (pErr) { console.error('Reset-and-seed: load products error', pErr); return res.status(500).json({ message: 'Load products failed' }); }
        if (!products || products.length === 0) return res.status(400).json({ message: 'No products to create orders' });

        const rnd = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
        const pad2 = n=> String(n).padStart(2,'0');

        const monthJobs = [];
        for(let m=1;m<=12;m++){
          const count = rnd(perMin, perMax);
          const season = 0.8 + 0.4 * Math.sin((m/12)*Math.PI*2);
          for(let k=0;k<count;k++){
            const day = rnd(1, 28);
            const hh = pad2(rnd(9,20));
            const mi = pad2(rnd(0,59));
            const ss = pad2(rnd(0,59));
            const ts = `${year}-${pad2(m)}-${pad2(day)} ${hh}:${mi}:${ss}`;
            const itemsCount = rnd(1, Math.min(4, products.length));
            const picked = [];
            const used = new Set();
            for(let i=0;i<itemsCount;i++){
              let idx = rnd(0, products.length-1);
              while(used.has(idx)) idx = rnd(0, products.length-1);
              used.add(idx);
              const qty = rnd(1, 3);
              const basePrice = Number(products[idx].price) || rnd(50000, 200000);
              picked.push({ id: products[idx].id, quantity: qty, price: basePrice, name: products[idx].name });
            }
            let total = picked.reduce((s,it)=> s + it.price * it.quantity, 0);
            total = Math.round(total * season);
            const cartItemsStr = JSON.stringify(picked);
            monthJobs.push({ ts, total, cartItemsStr, picked });
          }
        }

        let inserted = 0;
        const soldMap = new Map();
        const doOne = (idx) => {
          if (idx >= monthJobs.length){
            if (soldMap.size === 0) return res.json({ deletedAll: true, inserted, year });
            const entries = Array.from(soldMap.entries());
            let done = 0;
            entries.forEach(([pid, qty]) => {
              db.query('UPDATE product SET sold = sold + ? WHERE id = ?', [qty, pid], (uErr)=>{
                if (uErr) console.error('Reset-and-seed: update sold error', uErr);
                done++;
                if (done === entries.length){
                  return res.json({ deletedAll: true, inserted, year });
                }
              });
            });
            return;
          }
          const job = monthJobs[idx];
          const insertSql = 'INSERT INTO orders (fullName, email, mobile, address, state, paymentMethod, total, cartItems, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)';
          const vals = ['Demo User','demo@example.com','0123456789','HCMC, VN','completed','cod', Math.round(job.total), job.cartItemsStr, 'completed', job.ts];
          db.query(insertSql, vals, (iErr) => {
            if (iErr) { console.error('Reset-and-seed: insert order error', iErr); return doOne(idx+1); }
            inserted++;
            job.picked.forEach(it => { soldMap.set(it.id, (soldMap.get(it.id)||0) + Number(it.quantity||0)); });
            doOne(idx+1);
          });
        };
        doOne(0);
      });
    });
  });
});

// Admin: Products CRUD (sau authenticateAdmin)
app.get('/admin/products', authenticateAdmin, (req, res) => {
  const alter1 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id INT NULL';
  const alter2 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS publisher_id INT NULL';
  const alter3 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS author_id INT NULL';
  db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => {
    const sql = 'SELECT p.id, p.name, p.price, p.description, p.img, p.stock, p.sold, p.rating, p.category_id, c.name AS category_name, p.publisher_id, pub.name AS publisher_name, p.author_id, auth.name AS author_name FROM product p LEFT JOIN category c ON p.category_id = c.id LEFT JOIN party pub ON p.publisher_id = pub.id LEFT JOIN party auth ON p.author_id = auth.id ORDER BY p.id DESC';
    db.query(sql, (err, rows) => {
      if (err) {
        console.error('Admin products list error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(rows || []);
    });
  })));
});

app.post('/admin/products', authenticateAdmin, (req, res) => {
  const { name, price, description, img, stock, category_id, publisher_id, author_id } = req.body || {};
  if (!name || price == null) return res.status(400).json({ message: 'name and price are required' });
  const alter1 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id INT NULL';
  const alter2 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS publisher_id INT NULL';
  const alter3 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS author_id INT NULL';
  db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => {
    const sql = 'INSERT INTO product (name, price, description, img, stock, category_id, publisher_id, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, Number(price)||0, description||'', img||'', Number(stock)||0, category_id || null, publisher_id || null, author_id || null], (err, result) => {
      if (err) {
        console.error('Admin product create error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(201).json({ id: result.insertId, name, price: Number(price)||0, description: description||'', img: img||'', stock: Number(stock)||0, category_id: category_id||null, publisher_id: publisher_id||null, author_id: author_id||null });
    });
  })));
});

app.put('/admin/products/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, price, description, img, stock, category_id, publisher_id, author_id } = req.body || {};
  const alter1 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id INT NULL';
  const alter2 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS publisher_id INT NULL';
  const alter3 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS author_id INT NULL';
  db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => {
    const sql = 'UPDATE product SET name = ?, price = ?, description = ?, img = ?, stock = ?, category_id = ?, publisher_id = ?, author_id = ? WHERE id = ?';
    db.query(sql, [name, Number(price)||0, description||'', img||'', Number(stock)||0, category_id || null, publisher_id || null, author_id || null, id], (err) => {
      if (err) {
        console.error('Admin product update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json({ id, name, price: Number(price)||0, description: description||'', img: img||'', stock: Number(stock)||0, category_id: category_id||null, publisher_id: publisher_id||null, author_id: author_id||null });
    });
  })));
});

app.delete('/admin/products/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const sql = 'DELETE FROM product WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Admin product delete error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ id, deleted: true });
  });
});

// Adjust product stock (inventory): set absolute or add/sub delta
// PATCH /admin/products/:id/stock  { newStock?: number, delta?: number }
app.patch('/admin/products/:id/stock', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid product id' });
  const hasNew = req.body && (req.body.newStock !== undefined && req.body.newStock !== null);
  const hasDelta = req.body && (req.body.delta !== undefined && req.body.delta !== null);
  if (!hasNew && !hasDelta) return res.status(400).json({ message: 'newStock or delta is required' });

  const getSql = 'SELECT stock FROM product WHERE id = ? LIMIT 1';
  db.query(getSql, [id], (gErr, rows) => {
    if (gErr) { console.error('Get stock error:', gErr); return res.status(500).json({ message: 'Internal server error' }); }
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    const current = Number(rows[0].stock) || 0;
    let next = current;
    if (hasNew) {
      next = Math.max(0, Number(req.body.newStock) || 0);
    } else if (hasDelta) {
      next = Math.max(0, current + Number(req.body.delta || 0));
    }
    const upSql = 'UPDATE product SET stock = ? WHERE id = ?';
    db.query(upSql, [next, id], (uErr) => {
      if (uErr) { console.error('Update stock error:', uErr); return res.status(500).json({ message: 'Internal server error' }); }
      return res.json({ id, stock: next });
    });
  });
});

// Admin: Categories CRUD (auto create table if not exists)
function ensureCategoryTable(cb){
  const createSql = 'CREATE TABLE IF NOT EXISTS category (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    name VARCHAR(255) NOT NULL,\n    description TEXT,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n  )';
  db.query(createSql, cb);
}

app.get('/admin/categories', authenticateAdmin, (req, res) => {
  ensureCategoryTable((err)=>{
    if (err) { console.error('Ensure category table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'SELECT id, name, description, created_at FROM category ORDER BY id DESC';
    db.query(sql, (err2, rows) => {
      if (err2) { console.error('Categories list error:', err2); return res.status(500).json({ message: 'Internal server error' }); }
      res.json(rows || []);
    });
  });
});

app.post('/admin/categories', authenticateAdmin, (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name is required' });
  ensureCategoryTable((err)=>{
    if (err) { console.error('Ensure category table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'INSERT INTO category (name, description) VALUES (?, ?)';
    db.query(sql, [name, description||''], (e, result) => {
      if (e) { console.error('Category create error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.status(201).json({ id: result.insertId, name, description: description||'' });
    });
  });
});

app.put('/admin/categories/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body || {};
  const sql = 'UPDATE category SET name = ?, description = ? WHERE id = ?';
  db.query(sql, [name, description||'', id], (err) => {
    if (err) { console.error('Category update error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, name, description: description||'' });
  });
});

app.delete('/admin/categories/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const sql = 'DELETE FROM category WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) { console.error('Category delete error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, deleted: true });
  });
});

// Admin: Parties (publisher/author) CRUD
function ensurePartyTable(cb){
  const createSql = 'CREATE TABLE IF NOT EXISTS party (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    type VARCHAR(32) NOT NULL,\n    name VARCHAR(255) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n  )';
  db.query(createSql, cb);
}

// List parties by type: /admin/parties?type=publisher|author
app.get('/admin/parties', authenticateAdmin, (req, res) => {
  const type = String(req.query.type || '').toLowerCase();
  ensurePartyTable((err)=>{
    if (err) { console.error('Ensure party table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    let sql = 'SELECT id, type, name, created_at FROM party';
    const params = [];
    if (type === 'publisher' || type === 'author') { sql += ' WHERE type = ?'; params.push(type); }
    sql += ' ORDER BY id DESC';
    db.query(sql, params, (e, rows)=>{
      if (e) { console.error('Parties list error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.json(rows || []);
    });
  });
});

app.post('/admin/parties', authenticateAdmin, (req, res) => {
  const { type, name } = req.body || {};
  const t = String(type||'').toLowerCase();
  if (!name || !(t==='publisher' || t==='author')) return res.status(400).json({ message: 'type (publisher|author) and name are required' });
  ensurePartyTable((err)=>{
    if (err) { console.error('Ensure party table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'INSERT INTO party (type, name) VALUES (?, ?)';
    db.query(sql, [t, name], (e, result)=>{
      if (e) { console.error('Party create error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.status(201).json({ id: result.insertId, type: t, name });
    });
  });
});

app.put('/admin/parties/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name is required' });
  ensurePartyTable((err)=>{
    if (err) { console.error('Ensure party table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'UPDATE party SET name = ? WHERE id = ?';
    db.query(sql, [name, id], (e)=>{
      if (e) { console.error('Party update error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.json({ id, name });
    });
  });
});

app.delete('/admin/parties/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  ensurePartyTable((err)=>{
    if (err) { console.error('Ensure party table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'DELETE FROM party WHERE id = ?';
    db.query(sql, [id], (e)=>{
      if (e) { console.error('Party delete error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.json({ id, deleted: true });
    });
  });
});

// Admin: Users management (list, create, change role)
app.get('/admin/users', authenticateAdmin, (req, res) => {
  const sql = 'SELECT id, email, role, created_at FROM user ORDER BY id DESC';
  db.query(sql, (err, rows) => {
    if (err) { console.error('Admin users list error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json(rows || []);
  });
});

app.post('/admin/users', authenticateAdmin, (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email và password là bắt buộc' });
  const r = String(role || 'user').toLowerCase();
  const checkSql = 'SELECT id FROM user WHERE email = ? LIMIT 1';
  db.query(checkSql, [email], (cErr, cRows) => {
    if (cErr) { console.error('Check user error:', cErr); return res.status(500).json({ message: 'Internal server error' }); }
    if (Array.isArray(cRows) && cRows.length > 0) return res.status(409).json({ message: 'Email đã tồn tại' });
    let hashed = password;
    try { hashed = bcrypt.hashSync(password, 10); } catch(_){ /* fallback plain if needed */ }
    const insSql = 'INSERT INTO user (email, password, role, created_at) VALUES (?, ?, ?, NOW())';
    db.query(insSql, [email, hashed, r], (iErr, result) => {
      if (iErr) { console.error('Create user error:', iErr); return res.status(500).json({ message: 'Internal server error' }); }
      return res.status(201).json({ id: result.insertId, email, role: r });
    });
  });
});

app.patch('/admin/users/:id/role', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const role = String(req.body?.role || '').toLowerCase();
  if (!['user','admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const sql = 'UPDATE user SET role = ? WHERE id = ?';
  db.query(sql, [role, id], (err) => {
    if (err) { console.error('Change role error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, role });
  });
});

// Admin: Get order detail by id
app.get('/admin/orders/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid order id' });
  }
  const query = 'SELECT * FROM orders WHERE id = ? LIMIT 1';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching order detail:', err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = results[0];
    // Parse cartItems from JSON string to object
    if (order.cartItems) {
      try {
        order.cartItems = JSON.parse(order.cartItems);
      } catch (e) {
        console.error('Error parsing cartItems for order', order.id, ':', e);
        order.cartItems = [];
      }
    } else {
      order.cartItems = [];
    }
    res.json(order);
  });
});

// Admin: update order status
app.patch('/admin/orders/:id/status', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['pending','paid','shipped','completed','canceled'];
  if (!allowed.includes(String(status || '').toLowerCase())) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const sql = 'UPDATE orders SET status = ? WHERE id = ?';
  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error('Update order status error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ id, status });
  });
});

// ===== Dashboard highlight stats =====
// Low stock top N
app.get('/admin/stats/low-stock', authenticateAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query.limit)||5));
  const sql = 'SELECT id, name, stock, sold FROM product ORDER BY stock ASC, sold DESC LIMIT ?';
  db.query(sql, [limit], (err, rows) => {
    if (err) { console.error('Low stock query error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json(rows || []);
  });
});

// New customers within last `days` (derived from user table joined with orders)
app.get('/admin/stats/new-customers', authenticateAdmin, (req, res) => {
  const days = Math.max(1, Math.min(90, Number(req.query.days)||7));
  const sql = `
    SELECT u.email, u.created_at AS first_order, MAX(o.fullName) AS name
    FROM \`user\` u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY u.id, u.email, u.created_at
    ORDER BY u.created_at DESC
    LIMIT 20`;
  db.query(sql, [days], (err, rows) => {
    if (err) { console.error('New customers query error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json(rows || []);
  });
});

// Top customers by revenue (cast total to numeric), optional days window
app.get('/admin/stats/top-customers', authenticateAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query.limit)||5));
  const days = Number(req.query.days)||0; // 0 = all time
  const clean = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(o.total,'₫',''),' đ',''),'đ',''),',',''),' ','')`;
  let sql, params;
  if (days > 0) {
    sql = `
      SELECT u.email, MAX(o.fullName) AS name,
        IFNULL(SUM(CAST(${clean} AS DECIMAL(18,2))), 0) AS revenue,
        COUNT(o.id) AS orders
      FROM \`user\` u
      LEFT JOIN orders o ON o.user_id = u.id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.id, u.email
      HAVING COUNT(o.id) > 0
      ORDER BY revenue DESC
      LIMIT ?`;
    params = [days, limit];
  } else {
    sql = `
      SELECT u.email, MAX(o.fullName) AS name,
        IFNULL(SUM(CAST(${clean} AS DECIMAL(18,2))), 0) AS revenue,
        COUNT(o.id) AS orders
      FROM \`user\` u
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id, u.email
      HAVING COUNT(o.id) > 0
      ORDER BY revenue DESC
      LIMIT ?`;
    params = [limit];
  }
  db.query(sql, params, (err, rows) => {
    if (err) { console.error('Top customers query error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    res.json(rows || []);
  });
});

// Admin: Publishers/Authors unified (parties)
function ensurePartyTable(cb){
  const sql = "CREATE TABLE IF NOT EXISTS party (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    name VARCHAR(255) NOT NULL,\n    type ENUM('publisher','author') NOT NULL,\n    description TEXT,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n  )";
  db.query(sql, cb);
}

app.get('/admin/parties', authenticateAdmin, (req, res) => {
  ensurePartyTable((err)=>{
    if (err) { console.error('Ensure party table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const type = (req.query.type||'').toLowerCase();
    const allowed = ['publisher','author'];
    const sql = allowed.includes(type)
      ? 'SELECT id, name, type, description, created_at FROM party WHERE type = ? ORDER BY id DESC'
      : 'SELECT id, name, type, description, created_at FROM party ORDER BY id DESC';
    db.query(sql, allowed.includes(type)?[type]:[], (e, rows)=>{
      if (e) { console.error('Parties list error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.json(rows||[]);
    });
  });
});

app.post('/admin/parties', authenticateAdmin, (req, res) => {
  const { name, type, description } = req.body || {};
  if (!name || !type) return res.status(400).json({ message: 'name and type are required' });
  const t = String(type).toLowerCase();
  if (!['publisher','author'].includes(t)) return res.status(400).json({ message: 'invalid type' });
  ensurePartyTable((err)=>{
    if (err) { console.error('Ensure party table error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    db.query('INSERT INTO party (name, type, description) VALUES (?,?,?)', [name, t, description||''], (e, result)=>{
      if (e) { console.error('Party create error:', e); return res.status(500).json({ message: 'Internal server error' }); }
      res.status(201).json({ id: result.insertId, name, type: t, description: description||'' });
    });
  });
});

app.put('/admin/parties/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, type, description } = req.body || {};
  const t = type ? String(type).toLowerCase() : undefined;
  const allowed = ['publisher','author'];
  if (t && !allowed.includes(t)) return res.status(400).json({ message:'invalid type' });
  const fields = [];
  const vals = [];
  if (name != null){ fields.push('name = ?'); vals.push(name); }
  if (t){ fields.push('type = ?'); vals.push(t); }
  if (description != null){ fields.push('description = ?'); vals.push(description||''); }
  if (!fields.length) return res.status(400).json({ message: 'no fields to update' });
  const sql = `UPDATE party SET ${fields.join(', ')} WHERE id = ?`;
  vals.push(id);
  db.query(sql, vals, (e)=>{
    if (e) { console.error('Party update error:', e); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, name, type: t, description });
  });
});

app.delete('/admin/parties/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.query('DELETE FROM party WHERE id = ?', [id], (e)=>{
    if (e) { console.error('Party delete error:', e); return res.status(500).json({ message: 'Internal server error' }); }
    res.json({ id, deleted: true });
  });
});

// Admin: Roles & Permissions
app.get('/admin/users', authenticateAdmin, (req, res) => {
  const alter = 'ALTER TABLE `user` ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT "user"';
  db.query(alter, () => {
    const sql = 'SELECT id, email, role, created_at FROM `user` ORDER BY id DESC';
    db.query(sql, (err, rows) => {
      if (err) { console.error('Users list error:', err); return res.status(500).json({ message: 'Internal server error' }); }
      res.json(rows||[]);
    });
  });
});

app.patch('/admin/users/:id/role', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  const allowed = ['user','admin'];
  if (!allowed.includes(String(role||'').toLowerCase())) return res.status(400).json({ message: 'Invalid role' });
  const alter = 'ALTER TABLE `user` ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT "user"';
  db.query(alter, () => {
    const sql = 'UPDATE `user` SET role = ? WHERE id = ?';
    db.query(sql, [role, id], (err) => {
      if (err) { console.error('Role update error:', err); return res.status(500).json({ message: 'Internal server error' }); }
      res.json({ id, role });
    });
  });
});

// Public: Get settings (for frontend display)
app.get('/api/settings', (req, res) => {
  const createTable = `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;
  db.query(createTable, (err) => {
    if (err) { console.error('Settings table creation error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'SELECT `key`, value, type FROM settings';
    db.query(sql, (err, rows) => {
      if (err) { console.error('Settings fetch error:', err); return res.status(500).json({ message: 'Internal server error' }); }
      const map = {};
      if (rows && Array.isArray(rows)) {
        rows.forEach(row => {
          map[row.key] = { key: row.key, value: row.value || '', type: row.type || 'string' };
        });
      }
      res.json(map);
    });
  });
});

// Admin: Settings
app.get('/admin/settings', authenticateAdmin, (req, res) => {
  const createTable = `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;
  db.query(createTable, (err) => {
    if (err) { console.error('Settings table creation error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    const sql = 'SELECT `key`, value, type FROM settings';
    db.query(sql, (err, rows) => {
      if (err) { console.error('Settings fetch error:', err); return res.status(500).json({ message: 'Internal server error' }); }
      const map = {};
      if (rows && Array.isArray(rows)) {
        rows.forEach(row => {
          map[row.key] = { key: row.key, value: row.value || '', type: row.type || 'string' };
        });
      }
      res.json(map);
    });
  });
});

app.put('/admin/settings', authenticateAdmin, (req, res) => {
  const settings = req.body || [];
  if (!Array.isArray(settings) || settings.length === 0) {
    return res.status(400).json({ message: 'Invalid settings data' });
  }
  const createTable = `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;
  db.query(createTable, (err) => {
    if (err) { console.error('Settings table creation error:', err); return res.status(500).json({ message: 'Internal server error' }); }
    let completed = 0;
    let errors = [];
    if (settings.length === 0) {
      return res.json({ message: 'Settings saved successfully', count: 0 });
    }
    settings.forEach((setting, index) => {
      const { key, value, type } = setting || {};
      if (!key) { 
        errors.push(`Setting ${index}: missing key`); 
        completed++;
        if (completed === settings.length) {
          if (errors.length > 0) {
            return res.status(400).json({ message: 'Some settings failed to save', errors });
          }
          res.json({ message: 'Settings saved successfully', count: settings.length });
        }
        return;
      }
      const sql = 'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, type = ?';
      db.query(sql, [key, String(value || ''), type || 'string', String(value || ''), type || 'string'], (err) => {
        if (err) { 
          console.error('Settings save error:', err); 
          errors.push(`Setting ${key}: ${err.message}`);
        }
        completed++;
        if (completed === settings.length) {
          if (errors.length > 0) {
            return res.status(500).json({ message: 'Some settings failed to save', errors });
          }
          res.json({ message: 'Settings saved successfully', count: settings.length });
        }
      });
    });
  });
});

// Voucher API
app.get('/api/vouchers', (req, res) => {
  const userId = getUserIdFromAuth(req);
  ensureVoucherInfra((err) => {
    if (err) {
      console.error('Ensure voucher infra error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const sql = `SELECT * FROM vouchers 
      WHERE is_active = TRUE
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY created_at DESC`;
    db.query(sql, (vErr, rows) => {
      if (vErr) {
        console.error('Fetch vouchers error:', vErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      const vouchers = (rows || []).map(normalizeVoucherRow);
      if (!userId) {
        return res.json(vouchers.map(v => ({
          ...v,
          remaining: v.quantity != null ? Math.max(0, v.quantity - (v.claimed_count || 0)) : null,
          claimed: false,
          user_voucher_id: null
        })));
      }
      const uvSql = 'SELECT id, voucher_id, is_used FROM user_vouchers WHERE user_id = ?';
      db.query(uvSql, [userId], (uvErr, uvRows) => {
        if (uvErr) {
          console.error('Fetch user vouchers error:', uvErr);
          return res.status(500).json({ message: 'Internal server error' });
        }
        const claimedMap = new Map();
        (uvRows || []).forEach((uv) => claimedMap.set(uv.voucher_id, uv));
        const result = vouchers.map((v) => {
          const claimed = claimedMap.get(v.id);
          return {
            ...v,
            remaining: v.quantity != null ? Math.max(0, v.quantity - (v.claimed_count || 0)) : null,
            claimed: !!claimed,
            user_voucher_id: claimed ? claimed.id : null,
            user_voucher_used: claimed ? !!claimed.is_used : false
          };
        });
        res.json(result);
      });
    });
  });
});

app.get('/api/my-vouchers', authenticateUser, (req, res) => {
  const userId = req.user.id;
  ensureVoucherInfra((err) => {
    if (err) {
      console.error('Ensure voucher infra error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const sql = `
      SELECT uv.id AS user_voucher_id, uv.is_used, uv.received_at, uv.used_at, uv.origin,
             v.*
      FROM user_vouchers uv
      JOIN vouchers v ON uv.voucher_id = v.id
      WHERE uv.user_id = ?
      ORDER BY uv.received_at DESC`;
    db.query(sql, [userId], (listErr, rows) => {
      if (listErr) {
        console.error('My vouchers error:', listErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      const data = (rows || []).map(row => ({
        user_voucher_id: row.user_voucher_id,
        is_used: !!row.is_used,
        received_at: row.received_at,
        used_at: row.used_at,
        origin: row.origin,
        ...normalizeVoucherRow(row)
      }));
      res.json(data);
    });
  });
});

app.post('/api/vouchers/claim', authenticateUser, (req, res) => {
  const userId = req.user.id;
  const { voucherId, code } = req.body || {};
  if (!voucherId && !code) {
    return res.status(400).json({ message: 'Thiếu thông tin voucher cần nhận' });
  }
  ensureVoucherInfra((err) => {
    if (err) {
      console.error('Ensure voucher infra error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const lookupSql = voucherId
      ? 'SELECT * FROM vouchers WHERE id = ? LIMIT 1'
      : 'SELECT * FROM vouchers WHERE code = ? LIMIT 1';
    const lookupVal = voucherId ? [Number(voucherId)] : [String(code || '').toUpperCase()];
    db.query(lookupSql, lookupVal, (selErr, rows) => {
      if (selErr) {
        console.error('Lookup voucher error:', selErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Voucher không tồn tại' });
      }
      const voucher = normalizeVoucherRow(rows[0]);
      if (!voucher.is_active) {
        return res.status(400).json({ message: 'Voucher đã bị vô hiệu hóa' });
      }
      const now = new Date();
      if (voucher.start_date && new Date(voucher.start_date) > now) {
        return res.status(400).json({ message: 'Voucher chưa bắt đầu' });
      }
      if (voucher.end_date && new Date(voucher.end_date) < now) {
        return res.status(400).json({ message: 'Voucher đã hết hạn' });
      }
      if (voucher.quantity != null && voucher.claimed_count >= voucher.quantity) {
        return res.status(400).json({ message: 'Voucher đã hết số lượng' });
      }
      const checkSql = 'SELECT id FROM user_vouchers WHERE user_id = ? AND voucher_id = ? LIMIT 1';
      db.query(checkSql, [userId, voucher.id], (checkErr, existing) => {
        if (checkErr) {
          console.error('Check user voucher error:', checkErr);
          return res.status(500).json({ message: 'Internal server error' });
        }
        if (existing && existing.length > 0) {
          return res.status(409).json({ message: 'Bạn đã nhận voucher này rồi' });
        }
        const insertSql = 'INSERT INTO user_vouchers (user_id, voucher_id, origin) VALUES (?, ?, ?)';
        db.query(insertSql, [userId, voucher.id, 'manual-claim'], (insErr, result) => {
          if (insErr) {
            console.error('Claim voucher insert error:', insErr);
            return res.status(500).json({ message: 'Không thể lưu voucher' });
          }
          const userVoucherId = result?.insertId || null;
          const updateSql = 'UPDATE vouchers SET claimed_count = claimed_count + 1 WHERE id = ?';
          db.query(updateSql, [voucher.id], () => {
            res.json({
              message: 'Đã lưu voucher vào tài khoản',
              voucher: {
                ...voucher,
                claimed_count: (voucher.claimed_count || 0) + 1
              },
              user_voucher_id: userVoucherId
            });
          });
        });
      });
    });
  });
});

// Validate voucher code (shared for manual entry)
app.post('/api/vouchers/validate', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Mã voucher không hợp lệ' });
  }
  ensureVouchersTable((err) => {
    if (err) {
      console.error('Ensure vouchers error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const sql = `SELECT * FROM vouchers WHERE code = ? AND is_active = TRUE 
                 AND (start_date IS NULL OR start_date <= NOW()) 
                 AND (end_date IS NULL OR end_date >= NOW())`;
    db.query(sql, [code.toUpperCase()], (vErr, rows) => {
      if (vErr) {
        console.error('Voucher validation error:', vErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Mã voucher không tồn tại hoặc đã hết hạn' });
      }
      const voucher = rows[0];
      if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) {
        return res.status(400).json({ message: 'Mã voucher đã hết lượt sử dụng' });
      }
      res.json({
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: Number(voucher.discount_value),
        min_order_amount: Number(voucher.min_order_amount || 0),
        max_discount: voucher.max_discount ? Number(voucher.max_discount) : null
      });
    });
  });
});

// Admin: Get all vouchers
app.get('/admin/vouchers', authenticateAdmin, (req, res) => {
  ensureVouchersTable((err) => {
    if (err) {
      console.error('Vouchers table ensure error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    db.query('SELECT * FROM vouchers ORDER BY created_at DESC', (listErr, rows) => {
      if (listErr) {
        console.error('Vouchers fetch error:', listErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(rows || []);
    });
  });
});

// Admin: Create/Update voucher
app.post('/admin/vouchers', authenticateAdmin, (req, res) => {
  const { code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, start_date, end_date, is_active, quantity } = req.body;
  
  if (!code || !discount_value) {
    return res.status(400).json({ message: 'Mã voucher và giá trị giảm giá là bắt buộc' });
  }
  
  ensureVouchersTable((err) => {
    if (err) {
      console.error('Vouchers table ensure error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const sql = `INSERT INTO vouchers (code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, start_date, end_date, is_active, quantity)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 name = VALUES(name),
                 description = VALUES(description),
                 discount_type = VALUES(discount_type),
                 discount_value = VALUES(discount_value),
                 min_order_amount = VALUES(min_order_amount),
                 max_discount = VALUES(max_discount),
                 usage_limit = VALUES(usage_limit),
                 start_date = VALUES(start_date),
                 end_date = VALUES(end_date),
                 quantity = VALUES(quantity),
                 is_active = VALUES(is_active)`;
    
    db.query(sql, [
      code.toUpperCase(),
      name || null,
      description || null,
      discount_type || 'percent',
      discount_value,
      min_order_amount || 0,
      max_discount || null,
      usage_limit || null,
      start_date || null,
      end_date || null,
      is_active !== undefined ? is_active : true,
      quantity != null ? Number(quantity) : null
    ], (err, result) => {
      if (err) {
        console.error('Voucher save error:', err);
        return res.status(500).json({ message: 'Lỗi khi lưu voucher' });
      }
      res.json({ message: 'Voucher đã được lưu thành công', id: result.insertId });
    });
  });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
