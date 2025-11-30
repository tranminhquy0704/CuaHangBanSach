require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');

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
    // Ensure chat tables exist for storing conversations/messages
    try {
      ensureChatTables((chatErr) => {
        if (chatErr) console.error('Chat tables creation error:', chatErr);
        else console.log('Chat tables ready');
      });
    } catch (e) {
      console.error('ensureChatTables not available at startup:', e);
    }
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

function formatVND(amount) {
  if (amount == null || isNaN(amount)) return '0 ₫';
  return Math.round(amount).toLocaleString('vi-VN') + ' ₫';
}

function calculateCartSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    // Sử dụng price (giá sau sale) - đây là số tiền customer thực tế trả
    const unit = parseVNDValue(item?.price);
    const qty = Number(item?.quantity) || 1;
    return sum + unit * qty;
  }, 0);
}

// Chat persistence: create tables and simple endpoints to store/retrieve messages
function ensureChatTables(cb) {
  const sql1 = `CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL UNIQUE,
    user_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`;
  const sql2 = `CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )`;
  db.query(sql1, (err) => {
    if (err) return cb(err);
    db.query(sql2, cb);
  });
}

// Start a new conversation (returns sessionId)
app.post('/chat/start', (req, res) => {
  const userId = getUserIdFromAuth(req);
  const sessionId = 's_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  db.query('INSERT INTO conversations (session_id, user_id) VALUES (?, ?)', [sessionId, userId], (err, result) => {
    if (err) {
      console.error('Error creating conversation:', err);
      return res.status(500).json({ message: 'Không thể tạo cuộc trò chuyện' });
    }
    res.json({ sessionId });
  });
});

// Append a message to an existing conversation
app.post('/chat/message', (req, res) => {
  const { sessionId, role, content } = req.body || {};
  if (!sessionId || !content) return res.status(400).json({ message: 'sessionId và content là bắt buộc' });
  db.query('SELECT id FROM conversations WHERE session_id = ? LIMIT 1', [sessionId], (err, rows) => {
    if (err) {
      console.error('Error selecting conversation:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn' });
    }
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Conversation not found' });
    const convId = rows[0].id;
    db.query('INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)', [convId, role || 'user', content], (iErr, result) => {
      if (iErr) {
        console.error('Error inserting chat message:', iErr);
        return res.status(500).json({ message: 'Không thể lưu tin nhắn' });
      }
      res.json({ ok: true, messageId: result.insertId });
    });
  });
});

// Get messages for a session
app.get('/chat/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  db.query('SELECT id FROM conversations WHERE session_id = ? LIMIT 1', [sessionId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn' });
    if (!rows || rows.length === 0) return res.json({ messages: [] });
    const convId = rows[0].id;
    db.query('SELECT role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC', [convId], (mErr, mRows) => {
      if (mErr) return res.status(500).json({ message: 'Lỗi truy vấn tin nhắn' });
      res.json({ messages: mRows || [] });
    });
  });
});

// Debug: show whether chat tables exist and row counts
app.get('/debug/chat-tables', (req, res) => {
  const dbName = process.env.DB_NAME || 'shopbansach';
  const checkSql = `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND TABLE_NAME IN ('conversations','chat_messages')`;
  db.query(checkSql, [dbName], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi truy vấn information_schema', detail: err.message });
    const found = (rows || []).map(r => r.TABLE_NAME);
    const result = { database: dbName, foundTables: found, counts: {} };
    const tasks = [];
    if (found.includes('conversations')) {
      tasks.push((cb) => db.query('SELECT COUNT(*) AS c FROM conversations', (e, r) => { result.counts.conversations = (r && r[0] && r[0].c) || 0; cb(e); }));
    }
    if (found.includes('chat_messages')) {
      tasks.push((cb) => db.query('SELECT COUNT(*) AS c FROM chat_messages', (e, r) => { result.counts.chat_messages = (r && r[0] && r[0].c) || 0; cb(e); }));
    }
    // run tasks in sequence
    const run = (i=0) => {
      if (i >= tasks.length) return res.json(result);
      tasks[i]((taskErr) => {
        if (taskErr) return res.status(500).json({ error: 'Lỗi khi đếm hàng', detail: taskErr.message });
        run(i+1);
      });
    };
    run();
  });
});

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
    const alter4 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS is_flashsale TINYINT(1) DEFAULT 0';
    
    db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => db.query(alter4, () => {
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
        // Tắt cache để luôn lấy dữ liệu mới nhất
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.json(results || []);
      });
    }))));
  } else {
    // Nếu không có search, lấy tất cả sản phẩm
    console.log('[API Products] No search query, returning all products');
    const alter4 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS is_flashsale TINYINT(1) DEFAULT 0';
    db.query(alter4, () => {
      let query = `SELECT p.*, c.name as category_name 
                   FROM product p 
                   LEFT JOIN category c ON p.category_id = c.id`;
      
      // Filter out of stock if auto_hide is enabled
      if (autoHide) {
        query += ' WHERE (p.stock IS NULL OR p.stock > 0)';
      }
      
      query += ' ORDER BY p.id DESC';
      
      db.query(query, (err, results) => {
        if (err) {
          console.error('Error fetching products:', err);
          res.status(500).json({ message: 'Internal server error' });
          return;
        }
        // Tắt cache để luôn lấy dữ liệu mới nhất
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.json(results || []);
      });
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
      // Tắt cache để luôn lấy dữ liệu mới nhất
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.json(results[0]);
    }
  });
});

// Rate a product (minimal implementation)
app.post('/api/products/:id/rating', (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const stars = Number(req.body?.stars);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ message: 'stars must be 1..5' });
  }
  
  // Thêm các cột star_1 đến star_5 nếu chưa có
  const alterQueries = [
    'ALTER TABLE product ADD COLUMN IF NOT EXISTS star_1 INT DEFAULT 0',
    'ALTER TABLE product ADD COLUMN IF NOT EXISTS star_2 INT DEFAULT 0',
    'ALTER TABLE product ADD COLUMN IF NOT EXISTS star_3 INT DEFAULT 0',
    'ALTER TABLE product ADD COLUMN IF NOT EXISTS star_4 INT DEFAULT 0',
    'ALTER TABLE product ADD COLUMN IF NOT EXISTS star_5 INT DEFAULT 0'
  ];
  
  Promise.all(alterQueries.map(sql => new Promise((resolve) => {
    db.query(sql, () => resolve());
  }))).then(() => {
    // Đọc rating hiện tại và số lượng từng loại sao
    db.query('SELECT rating, rating_count, star_1, star_2, star_3, star_4, star_5 FROM product WHERE id = ?', [productId], (err, rows) => {
      if (err) {
        console.error('SELECT rating error:', err);
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
      
      // Cập nhật số lượng sao tương ứng
      const starCounts = {
        star_1: Number(cur.star_1) || 0,
        star_2: Number(cur.star_2) || 0,
        star_3: Number(cur.star_3) || 0,
        star_4: Number(cur.star_4) || 0,
        star_5: Number(cur.star_5) || 0
      };
      starCounts[`star_${stars}`]++;
      
      db.query(
        'UPDATE product SET rating = ?, rating_count = ?, star_1 = ?, star_2 = ?, star_3 = ?, star_4 = ?, star_5 = ? WHERE id = ?',
        [newRating, newCount, starCounts.star_1, starCounts.star_2, starCounts.star_3, starCounts.star_4, starCounts.star_5, productId],
        (uErr) => {
          if (uErr) {
            console.error('UPDATE rating error:', uErr);
            return res.status(500).json({ message: 'Internal server error' });
          }
          res.json({ 
            id: productId, 
            rating: newRating, 
            rating_count: newCount,
            star_1: starCounts.star_1,
            star_2: starCounts.star_2,
            star_3: starCounts.star_3,
            star_4: starCounts.star_4,
            star_5: starCounts.star_5
          });
        }
      );
    });
  });
});

// Comments API
// Tạo bảng comments nếu chưa có
db.query(`
  CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) console.error('Error creating comments table:', err);
});

// Lấy danh sách comments của sản phẩm
app.get('/api/products/:id/comments', (req, res) => {
  const productId = parseInt(req.params.id, 10);
  db.query(
    'SELECT id, user_name, comment, created_at FROM comments WHERE product_id = ? ORDER BY created_at DESC',
    [productId],
    (err, results) => {
      if (err) {
        console.error('Error fetching comments:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(results);
    }
  );
});

// Thêm comment mới
app.post('/api/products/:id/comments', (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { comment, userEmail, userName } = req.body;
  
  if (!comment || !comment.trim()) {
    return res.status(400).json({ message: 'Comment không được để trống' });
  }
  
  if (!userEmail || !userName) {
    return res.status(400).json({ message: 'Bạn cần đăng nhập để bình luận' });
  }
  
  db.query(
    'INSERT INTO comments (product_id, user_email, user_name, comment) VALUES (?, ?, ?, ?)',
    [productId, userEmail, userName, comment.trim()],
    (err, result) => {
      if (err) {
        console.error('Error inserting comment:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(201).json({
        id: result.insertId,
        product_id: productId,
        user_name: userName,
        comment: comment.trim(),
        created_at: new Date()
      });
    }
  );
});

// Lấy sản phẩm liên quan theo category
app.get('/api/products/:id/related', (req, res) => {
  const productId = parseInt(req.params.id, 10);
  
  // Lấy category_id của sản phẩm hiện tại
  db.query('SELECT category_id FROM product WHERE id = ?', [productId], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.json([]);
    }
    
    const categoryId = rows[0].category_id;
    if (!categoryId) {
      return res.json([]);
    }
    
    // Lấy 6 sản phẩm cùng category, trừ sản phẩm hiện tại
    db.query(
      'SELECT id, name, price, img, rating, sold FROM product WHERE category_id = ? AND id != ? ORDER BY sold DESC, rating DESC LIMIT 6',
      [categoryId, productId],
      (err2, results) => {
        if (err2) {
          console.error('Error fetching related products:', err2);
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.json(results);
      }
    );
  });
});

// Orders
app.post('/api/orders', (req, res) => {
  const { fullName, mobile, address, state, paymentMethod, total, cartItems, subtotal: clientSubtotal, voucherCode, userVoucherId } = req.body;
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
  // Sử dụng subtotal từ client (đã bao gồm giá sau sale) để validate voucher
  const subtotal = clientSubtotal ? Number(clientSubtotal) : calculateCartSubtotal(normalizedItems);
  console.log('[Orders] ===== ORDER DEBUG =====');
  console.log('[Orders] Cart items count:', normalizedItems.length);
  console.log('[Orders] Subtotal from client:', clientSubtotal);
  console.log('[Orders] Subtotal used for validation:', subtotal);
  console.log('[Orders] Total from client:', total);
  console.log('[Orders] Voucher code:', voucherCode);
  console.log('[Orders] User voucher ID:', userVoucherId);
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
              console.log('[Orders] Marking user_voucher as used:', voucherContext.userVoucherId);
              db.query('UPDATE user_vouchers SET is_used = TRUE, used_at = NOW() WHERE id = ?', [voucherContext.userVoucherId], (err, result) => {
                if (err) {
                  console.error('[Orders] Error marking voucher as used:', err);
                } else {
                  console.log('[Orders] Voucher marked as used, affected rows:', result?.affectedRows);
                }
                next();
              });
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
        console.log('[Orders] Voucher validation - code:', voucher.code, 'min_order:', voucher.min_order_amount, 'subtotal:', subtotal);
        
        // Kiểm tra điều kiện tối thiểu trên subtotal GỐC
        const minAmount = Number(voucher.min_order_amount || 0);
        if (subtotal < minAmount) {
          console.log('[Orders] Subtotal below minimum:', subtotal, '<', minAmount);
          return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${formatVND(minAmount)} để dùng voucher này` });
        }
        
        // Tính discount trên subtotal
        const discount = calculateVoucherDiscountAmount(voucher, subtotal);
        console.log('[Orders] Calculated discount:', discount);
        
        if (discount <= 0) {
          console.log('[Orders] Discount is zero or negative');
          return res.status(400).json({ message: 'Không thể áp dụng voucher này cho đơn hàng' });
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
          // Kiểm tra xem user đã claim voucher này và đã dùng chưa
          if (userId) {
            db.query('SELECT * FROM user_vouchers WHERE user_id = ? AND voucher_id = ? LIMIT 1', [userId, vRows[0].id], (uvErr, uvRows) => {
              if (uvErr) {
                console.error('Check user voucher error:', uvErr);
              }
              const userVoucher = uvRows && uvRows.length > 0 ? uvRows[0] : null;
              if (userVoucher && userVoucher.is_used) {
                return res.status(400).json({ message: 'Voucher này đã được sử dụng' });
              }
              onVoucherLoaded(vRows[0], userVoucher);
            });
          } else {
            onVoucherLoaded(vRows[0], null);
          }
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
  const baseDate = (req.query.date || '').trim();
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(baseDate);
  let sql;
  let params = [];
  if (isValidDate) {
    sql = `
      SELECT
        IFNULL(SUM(CASE WHEN DATE(created_at) = ? THEN ${total_num} END), 0) AS revenueToday,
        IFNULL(SUM(CASE WHEN DATE(created_at) = DATE_SUB(?, INTERVAL 1 DAY) THEN ${total_num} END), 0) AS revenueYesterday,
        IFNULL(SUM(CASE WHEN YEAR(created_at) = YEAR(?) AND MONTH(created_at) = MONTH(?) THEN ${total_num} END), 0) AS revenueThisMonth,
        COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) AS ordersToday,
        COUNT(CASE WHEN DATE(created_at) = DATE_SUB(?, INTERVAL 1 DAY) THEN 1 END) AS ordersYesterday
      FROM orders;
    `;
    params = [baseDate, baseDate, baseDate, baseDate, baseDate, baseDate];
  } else {
    sql = `
      SELECT
        IFNULL(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN ${total_num} END), 0) AS revenueToday,
        IFNULL(SUM(CASE WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN ${total_num} END), 0) AS revenueYesterday,
        IFNULL(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN ${total_num} END), 0) AS revenueThisMonth,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS ordersToday,
        COUNT(CASE WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 END) AS ordersYesterday
      FROM orders;
    `;
  }
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Metrics orders error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const ordersAgg = rows && rows[0] ? rows[0] : { revenueToday: 0, revenueYesterday: 0, revenueThisMonth: 0, ordersToday: 0, ordersYesterday: 0 };
    const lowStockSql = 'SELECT COUNT(*) AS c FROM product WHERE stock <= 5';
    db.query(lowStockSql, (e2, r2) => {
      if (e2) {
        console.error('Metrics stock error:', e2);
        return res.status(500).json({ message: 'Internal server error' });
      }
      const lowStockCount = r2 && r2[0] ? r2[0].c : 0;
      let newCustomersSql;
      let userParams = [];
      if (isValidDate) {
        newCustomersSql = `
          SELECT
            COUNT(CASE WHEN created_at >= DATE_SUB(?, INTERVAL 6 DAY) AND created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN 1 END) AS new7,
            COUNT(CASE WHEN created_at >= DATE_SUB(?, INTERVAL 13 DAY) AND created_at < DATE_SUB(?, INTERVAL 6 DAY) THEN 1 END) AS prev7
          FROM user`;
        userParams = [baseDate, baseDate, baseDate, baseDate];
      } else {
        newCustomersSql = `
          SELECT
            COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 1 END) AS new7,
            COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 DAY) THEN 1 END) AS prev7
          FROM user`;
      }
      db.query(newCustomersSql, userParams, (e3, r3) => {
        if (e3) {
          console.error('Metrics users error:', e3);
          return res.status(500).json({ message: 'Internal server error' });
        }
        const uRow = r3 && r3[0] ? r3[0] : { new7: 0, prev7: 0 };
        res.json({
          revenueToday: Number(ordersAgg.revenueToday) || 0,
          revenueYesterday: Number(ordersAgg.revenueYesterday) || 0,
          revenueThisMonth: Number(ordersAgg.revenueThisMonth) || 0,
          ordersToday: Number(ordersAgg.ordersToday) || 0,
          ordersYesterday: Number(ordersAgg.ordersYesterday) || 0,
          lowStockCount: Number(lowStockCount) || 0,
          newCustomers7: Number(uRow.new7) || 0,
          newCustomersPrev7: Number(uRow.prev7) || 0,
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

// Admin Dashboard: Revenue by category (hỗ trợ filter theo số ngày gần nhất)
app.get('/admin/charts/revenue-by-category', authenticateAdmin, (req, res) => {
  const days = Math.max(0, Number(req.query.days) || 0);
  if (days > 0) {
    // Tính doanh thu theo đơn hàng trong N ngày gần nhất
    const prodSql = 'SELECT p.id, p.price, c.name AS category_name FROM product p LEFT JOIN category c ON p.category_id = c.id';
    db.query(prodSql, (pErr, prodRows) => {
      if (pErr) {
        console.error('Revenue by category product map error:', pErr);
        return res.status(500).json({ message: 'Internal server error' });
      }
      const prodMap = new Map((prodRows || []).map(r => [Number(r.id), r]));
      const orderSql = 'SELECT cartItems FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      db.query(orderSql, [days], (oErr, orders) => {
        if (oErr) {
          console.error('Revenue by category orders error:', oErr);
          return res.status(500).json({ message: 'Internal server error' });
        }
        const agg = new Map();
        (orders || []).forEach(row => {
          let items = [];
          try {
            items = JSON.parse(row.cartItems || '[]');
          } catch (_) { items = []; }
          if (!Array.isArray(items)) return;
          items.forEach(it => {
            const id = Number(it.id) || 0;
            const qty = Number(it.quantity) || 0;
            if (!id || !qty) return;
            const prod = prodMap.get(id);
            const catName = (prod && prod.category_name) ? prod.category_name : 'Chưa phân loại';
            let price = prod && prod.price != null ? Number(prod.price) || 0 : 0;
            if (!price && it.price != null) price = parseVNDValue(it.price);
            const revenue = price * qty;
            agg.set(catName, (agg.get(catName) || 0) + revenue);
          });
        });
        const entries = Array.from(agg.entries()).sort((a,b)=> b[1]-a[1]).slice(0,5);
        const labels = entries.map(([name]) => name || 'Chưa phân loại');
        const data = entries.map(([,value]) => Number(value) || 0);
        res.json({ labels, data });
      });
    });
  } else {
    // Tổng theo toàn bộ dữ liệu bán ra
    const sql = `
      SELECT 
        COALESCE(c.name, 'Chưa phân loại') AS category_name,
        SUM(p.price * IFNULL(p.sold, 0)) AS revenue
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      GROUP BY c.id, category_name
      ORDER BY revenue DESC
      LIMIT 5
    `;
    db.query(sql, (err, rows) => {
      if (err) {
        console.error('Revenue by category error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      const labels = (rows || []).map(r => r.category_name || 'Chưa phân loại');
      const data = (rows || []).map(r => Number(r.revenue) || 0);
      res.json({ labels, data });
    });
  }
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

app.get('/admin/charts/orders', authenticateAdmin, (req, res) => {
  const by = (req.query.by || 'month').toLowerCase();
  let labelExpr;
  let displayLabelExpr = null;
  if (by === 'day') {
    labelExpr = 'DATE(created_at)';
    displayLabelExpr = "DATE_FORMAT(created_at, '%d/%m/%Y')";
  } else if (by === 'week') {
    labelExpr = 'YEARWEEK(created_at, 1)';
    displayLabelExpr = "CONCAT('Tuần ', DATE_FORMAT(created_at, '%u/%Y'))";
  } else if (by === 'year') {
    labelExpr = 'YEAR(created_at)';
    displayLabelExpr = 'YEAR(created_at)';
  } else {
    // month
    labelExpr = "DATE_FORMAT(created_at, '%Y-%m')";
    displayLabelExpr = labelExpr;
  }
  const sql = `SELECT ${labelExpr} AS label, ${displayLabelExpr || labelExpr} AS display_label, COUNT(*) AS total_orders
    FROM orders 
    WHERE created_at IS NOT NULL
    GROUP BY ${labelExpr}
    ORDER BY ${labelExpr} DESC
    LIMIT 30`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Orders chart error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const labels = (rows || []).map(r => String(r.display_label || r.label || ''));
    const data = (rows || []).map(r => Number(r.total_orders) || 0);
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
  const alter4 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS is_flashsale TINYINT(1) DEFAULT 0';
  db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => db.query(alter4, () => {
    const sql = 'SELECT p.id, p.name, p.price, p.description, p.img, p.stock, p.sold, p.rating, p.category_id, c.name AS category_name, p.publisher_id, pub.name AS publisher_name, p.author_id, auth.name AS author_name, p.discount, p.oldPrice, p.is_flashsale, p.isNew FROM product p LEFT JOIN category c ON p.category_id = c.id LEFT JOIN party pub ON p.publisher_id = pub.id LEFT JOIN party auth ON p.author_id = auth.id ORDER BY p.id DESC';
    db.query(sql, (err, rows) => {
      if (err) {
        console.error('Admin products list error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(rows || []);
    });
  }))));
});

app.post('/admin/products', authenticateAdmin, (req, res) => {
  const { name, price, description, img, stock, category_id, publisher_id, author_id, publisher, author, discount, oldPrice, is_flashsale, isNew } = req.body || {};
  console.log('[POST /admin/products] Received data:', { name, price, description, img, stock, category_id, publisher_id, author_id, publisher, author });
  if (!name || price == null) return res.status(400).json({ message: 'name and price are required' });
  const alter1 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id INT NULL';
  const alter2 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS publisher_id INT NULL';
  const alter3 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS author_id INT NULL';
  const alter4 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS is_flashsale TINYINT(1) DEFAULT 0';
  db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => db.query(alter4, () => {
    // Lấy tên author và publisher từ bảng party nếu có ID
    const promises = [];
    let authorName = author || null;
    let publisherName = publisher || null;
    
    if (author_id && !author) {
      promises.push(new Promise((resolve) => {
        db.query('SELECT name FROM party WHERE id = ? AND type = "author"', [author_id], (err, rows) => {
          if (!err && rows && rows.length > 0) authorName = rows[0].name;
          resolve();
        });
      }));
    }
    
    if (publisher_id && !publisher) {
      promises.push(new Promise((resolve) => {
        db.query('SELECT name FROM party WHERE id = ? AND type = "publisher"', [publisher_id], (err, rows) => {
          if (!err && rows && rows.length > 0) publisherName = rows[0].name;
          resolve();
        });
      }));
    }
    
    Promise.all(promises).then(() => {
      const sql = 'INSERT INTO product (name, price, description, img, stock, category_id, publisher_id, author_id, publisher, author, discount, oldPrice, is_flashsale, isNew) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      console.log('[POST /admin/products] Executing INSERT with values:', [name, Number(price)||0, description||'', img||'', Number(stock)||0]);
      db.query(sql, [
        name, 
        Number(price)||0, 
        description||'', 
        img||'', 
        Number(stock)||0, 
        category_id || null, 
        publisher_id || null, 
        author_id || null,
        publisherName,
        authorName,
        discount !== undefined ? (Number(discount) || null) : null,
        oldPrice !== undefined ? (Number(oldPrice) || null) : null,
        is_flashsale !== undefined ? (is_flashsale ? 1 : 0) : 0,
        isNew !== undefined ? (isNew ? 1 : 0) : 0
      ], (err, result) => {
        if (err) {
          console.error('Admin product create error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        console.log('[POST /admin/products] Product created with ID:', result.insertId);
        res.status(201).json({ 
          id: result.insertId, 
          name, 
          price: Number(price)||0, 
          description: description||'', 
          img: img||'',
          stock: Number(stock)||0, 
          category_id: category_id||null, 
          publisher_id: publisher_id||null, 
          author_id: author_id||null,
          publisher: publisherName,
          author: authorName,
          discount: discount !== undefined ? (Number(discount) || null) : null,
          oldPrice: oldPrice !== undefined ? (Number(oldPrice) || null) : null,
          is_flashsale: is_flashsale !== undefined ? (is_flashsale ? 1 : 0) : 0,
          isNew: isNew !== undefined ? (isNew ? 1 : 0) : 0
        });
      });
    });
  }))));
});

app.put('/admin/products/:id', authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, price, description, img, stock, category_id, publisher_id, author_id, discount, oldPrice, is_flashsale, isNew, author, publisher } = req.body || {};
  const alter1 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id INT NULL';
  const alter2 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS publisher_id INT NULL';
  const alter3 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS author_id INT NULL';
  const alter4 = 'ALTER TABLE product ADD COLUMN IF NOT EXISTS is_flashsale TINYINT(1) DEFAULT 0';
  db.query(alter1, () => db.query(alter2, () => db.query(alter3, () => db.query(alter4, () => {
    // Lấy tên author và publisher từ bảng party nếu có ID
    const promises = [];
    let authorName = author || null;
    let publisherName = publisher || null;
    
    if (author_id && !author) {
      promises.push(new Promise((resolve) => {
        db.query('SELECT name FROM party WHERE id = ? AND type = "author"', [author_id], (err, rows) => {
          if (!err && rows && rows.length > 0) authorName = rows[0].name;
          resolve();
        });
      }));
    }
    
    if (publisher_id && !publisher) {
      promises.push(new Promise((resolve) => {
        db.query('SELECT name FROM party WHERE id = ? AND type = "publisher"', [publisher_id], (err, rows) => {
          if (!err && rows && rows.length > 0) publisherName = rows[0].name;
          resolve();
        });
      }));
    }
    
    Promise.all(promises).then(() => {
      const sql = 'UPDATE product SET name = ?, price = ?, description = ?, img = ?, stock = ?, category_id = ?, publisher_id = ?, author_id = ?, discount = ?, oldPrice = ?, is_flashsale = ?, isNew = ?, author = ?, publisher = ? WHERE id = ?';
      db.query(sql, [
        name, 
        Number(price)||0, 
        description||'', 
        img||'', 
        Number(stock)||0, 
        category_id || null, 
        publisher_id || null, 
        author_id || null,
        discount !== undefined ? (Number(discount) || null) : null,
        oldPrice !== undefined ? (Number(oldPrice) || null) : null,
        is_flashsale !== undefined ? (is_flashsale ? 1 : 0) : 0,
        isNew !== undefined ? (isNew ? 1 : 0) : 0,
        authorName,
        publisherName,
        id
      ], (err) => {
        if (err) {
          console.error('Admin product update error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.json({ 
          id, 
          name, 
          price: Number(price)||0, 
          description: description||'', 
          img: img||'', 
          stock: Number(stock)||0, 
          category_id: category_id||null, 
          publisher_id: publisher_id||null, 
          author_id: author_id||null,
          discount: discount !== undefined ? (Number(discount) || null) : null,
          oldPrice: oldPrice !== undefined ? (Number(oldPrice) || null) : null,
          is_flashsale: is_flashsale !== undefined ? (is_flashsale ? 1 : 0) : 0,
          isNew: isNew !== undefined ? (isNew ? 1 : 0) : 0,
          author: authorName,
          publisher: publisherName
        });
      });
    });
  }))));
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

// Public API: Get all categories
app.get('/api/categories', (req, res) => {
  ensureCategoryTable((err) => {
    if (err) {
      console.error('Ensure category table error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const sql = 'SELECT id, name, description FROM category ORDER BY name ASC';
    db.query(sql, (err2, rows) => {
      if (err2) {
        console.error('Categories list error:', err2);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(rows || []);
    });
  });
});

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
  const sql = `
    SELECT 
      p.id,
      p.name,
      p.stock,
      p.sold,
      c.name AS category_name
    FROM product p
    LEFT JOIN category c ON p.category_id = c.id
    ORDER BY p.stock ASC, p.sold DESC
    LIMIT ?`;
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
        AND v.is_active = TRUE
        AND uv.is_used = FALSE
        AND (v.end_date IS NULL OR v.end_date >= NOW())
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
  const userId = getUserIdFromAuth(req);
  ensureVoucherInfra((err) => {
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
      
      // Kiểm tra user đã dùng voucher này chưa
      if (userId) {
        const checkUsedSql = 'SELECT id, is_used FROM user_vouchers WHERE user_id = ? AND voucher_id = ? LIMIT 1';
        db.query(checkUsedSql, [userId, voucher.id], (uvErr, uvRows) => {
          if (uvErr) {
            console.error('Check user voucher error:', uvErr);
          }
          if (uvRows && uvRows.length > 0 && uvRows[0].is_used) {
            return res.status(400).json({ message: 'Bạn đã sử dụng voucher này rồi' });
          }
          
          res.json({
            code: voucher.code,
            discount_type: voucher.discount_type,
            discount_value: Number(voucher.discount_value),
            min_order_amount: Number(voucher.min_order_amount || 0),
            max_discount: voucher.max_discount ? Number(voucher.max_discount) : null,
            user_voucher_id: uvRows && uvRows.length > 0 ? uvRows[0].id : null,
            already_claimed: uvRows && uvRows.length > 0
          });
        });
      } else {
        res.json({
          code: voucher.code,
          discount_type: voucher.discount_type,
          discount_value: Number(voucher.discount_value),
          min_order_amount: Number(voucher.min_order_amount || 0),
          max_discount: voucher.max_discount ? Number(voucher.max_discount) : null,
          user_voucher_id: null,
          already_claimed: false
        });
      }
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

// ===== CHATBOT AI ENDPOINT =====
// POST /api/chatbot - Chat with AI assistant
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Session ID for saving to database
    const sessionId = req.body.sessionId || req.query.sessionId || null;
    let convIdForSave = null;
    
    // Find or prepare conversation ID for saving
    if (sessionId) {
      try {
        const convRows = await new Promise((resolve, reject) => {
          db.query('SELECT id FROM conversations WHERE session_id = ? LIMIT 1', [sessionId], (e, r) => e ? reject(e) : resolve(r));
        });
        if (Array.isArray(convRows) && convRows.length > 0) {
          convIdForSave = convRows[0].id;
        }
      } catch (e) {
        console.error('Error finding conversation:', e);
      }
    }
    
    // Save user message to DB
    if (convIdForSave) {
      db.query('INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)', [convIdForSave, 'user', message], (ie) => {
        if (ie) console.error('Error saving user message to DB:', ie);
      });
    }

    // Check if any AI API key is configured (OpenRouter or OpenAI)
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    if (!hasOpenRouter && !hasOpenAI) {
      // Fallback: Return rule-based response nếu không có API key
      const fallbackResponse = await getFallbackResponse(message);
      
      // Save bot response to DB
      if (convIdForSave) {
        const textToSave = typeof fallbackResponse === 'object' ? fallbackResponse.text : fallbackResponse;
        db.query('INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)', [convIdForSave, 'assistant', textToSave], (ie) => {
          if (ie) console.error('Error saving assistant message to DB:', ie);
        });
      }
      
      return res.json({ 
        response: typeof fallbackResponse === 'object' ? fallbackResponse.text : fallbackResponse,
        products: typeof fallbackResponse === 'object' ? fallbackResponse.products : [],
        mode: 'fallback'
      });
    }

    // Initialize OpenAI client only if using OpenAI (not OpenRouter)
    let openai;
    if (hasOpenAI && !hasOpenRouter) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    // Get products for context
    const products = await new Promise((resolve, reject) => {
      db.query('SELECT id, name, price, discount, sold, author, publisher, img, description FROM product ORDER BY sold DESC, id DESC LIMIT 100', 
        (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
    });

    // System prompt với thông tin về shop
    const productList = products.map((p, idx) => 
      `${idx+1}. "${p.name}" - ${p.author || 'Tác giả không rõ'} - ${Number(p.price||0).toLocaleString('vi-VN')}đ${p.discount ? ` (giảm ${p.discount}%)` : ''}`
    ).join('\n');
    
    const systemPrompt = `Bạn là trợ lý ảo THÔNG MINH của Shop Bán Sách.

THÔNG TIN SHOP:
- Hotline: 0123-456-789
- Freeship đơn từ 200.000₫
- Giảm 15% cho khách mới

╔═══════════════════════════════════════════════════════╗
║   DANH SÁCH TẤT CẢ SÁCH CÓ SẴN TRONG SHOP (${products.length} cuốn)   ║
╚═══════════════════════════════════════════════════════╝
${productList}
╔═══════════════════════════════════════════════════════╗
║              HẾT DANH SÁCH - KHÔNG CÓ SÁCH NÀO KHÁC           ║
╚═══════════════════════════════════════════════════════╝

🚨 QUY TẮC BẮT BUỘC - TUYỆT ĐỐI KHÔNG VI PHẠM:
═══════════════════════════════════════════════════════════

1. ❌ NGHIÊM CẤM tự bịa thêm sách NGOÀI danh sách trên
2. ❌ NGHIÊM CẤM nói về sách không có ID trong danh sách
3. ✅ CHỈ giới thiệu sách CÓ TRONG DANH SÁCH với ID, tên, giá CHÍNH XÁC
4. ✅ Nếu KHÔNG TÌM THẤY sách phù hợp → Nói thật: "Shop mình chưa có loại sách này"
5. 🎯 KHI HỎI THỂ LOẠI: Chỉ lọc sách có [Thể loại] KHỚP CHÍNH XÁC với yêu cầu

📖 CÁCH XỬ LÝ CÂU HỎI VỀ THỂ LOẠI:
• VD: "Gợi ý manga" hoặc "Sách manga nào hay?"
  → CHỈ TÌM sách có [Manga - Comic] trong danh sách
  → ❌ KHÔNG giới thiệu [Ngôn tình], [Kỹ năng sống], v.v.
  → Nếu KHÔNG CÓ: "Shop chưa có sách manga ạ 😅"

• VD: "Sách kỹ năng sống"
  → CHỈ TÌM sách có [Kỹ năng sống] 
  → ❌ KHÔNG giới thiệu manga hay ngôn tình

• VD: "Sách lập trình"
  → CHỈ TÌM sách có [Lập trình] hoặc [Công nghệ]
  → Nếu không có: "Shop chưa có sách lập trình ạ"

• Khách hỏi câu KHÔNG liên quan sách:
  → Từ chối lịch sự: "Mình chỉ tư vấn về sách thôi ạ 😊"

💬 CÁCH TRẢ LỜI:
- TIẾNG VIỆT tự nhiên, thân thiện
- NGẮN GỌN (2-4 câu)
- Emoji vừa phải (1-2 emoji/câu)
- ⚠️ BẮT BUỘC: Khi giới thiệu sách, PHẢI ghi "ID: [số]" để hệ thống hiển thị card sản phẩm
- Format: "Tên sách (ID: 123) - Giá xxx₫"

✅ VÍ DỤ ĐÚNG:
Hỏi: "Gợi ý sách ngôn tình"
→ "Mình có mấy cuốn ngôn tình hay nè:
• Ương Ngạnh - Tập 2 (ID: 45) - 159.000₫ 💕
• All In Love (ID: 67) - 95.000₫ 🌸"

Hỏi: "Gợi ý manga"
→ Tìm sách có [Manga - Comic]: "Có Thám Tử Lừng Danh Conan (ID: 12) giá 159.000₫! 🔍"
→ Nếu KHÔNG CÓ [Manga - Comic]: "Shop chưa có manga ạ 😅"

❌ VÍ DỤ SAI:
Hỏi: "Gợi ý manga"
→ SAI: Giới thiệu sách [Ngôn tình] hay [Kỹ năng sống]
→ ĐÚNG: Chỉ giới thiệu sách có [Manga - Comic] hoặc nói "chưa có"

NHỚ: Chỉ dùng thông tin từ ${products.length} cuốn sách trong DANH SÁCH BÊN TRÊN và LỌC ĐÚNG THỂ LOẠI!`;


    // Optionally load conversation history from DB when sessionId provided,
    // then merge with any conversationHistory sent by client and keep the last 6 entries.
    let dbHistory = [];
    if (sessionId) {
      try {
        const convRows = await new Promise((resolve, reject) => {
          db.query('SELECT id FROM conversations WHERE session_id = ? LIMIT 1', [sessionId], (e, r) => e ? reject(e) : resolve(r));
        });
        if (Array.isArray(convRows) && convRows.length > 0) {
          const convId = convRows[0].id;
          const msgRows = await new Promise((resolve, reject) => {
            db.query('SELECT role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC', [convId], (e, r) => e ? reject(e) : resolve(r));
          });
          if (Array.isArray(msgRows)) {
            dbHistory = msgRows.map(m => ({ role: (m.role || 'user'), content: m.content }));
          }
        }
      } catch (dbErr) {
        console.error('Error loading conversation from DB:', dbErr);
        // don't fail the whole request; fall back to provided conversationHistory only
        dbHistory = [];
      }
    }

    const mergedHistory = [
      ...dbHistory,
      ...(Array.isArray(conversationHistory) ? conversationHistory : [])
    ].slice(-6);

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...mergedHistory,
      { role: 'user', content: message }
    ];

    // Decide provider: OpenRouter if key present, otherwise use OpenAI SDK
    let aiResponse = '';
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const routerModel = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
        const payload = { 
          model: routerModel, 
          messages: messages, 
          temperature: 0.6,  // Hạ nhẹ để trả lời ổn định và ít ảo tưởng
          max_tokens: 1000,  // Cho phép trả lời đầy đủ hơn khi cần
          top_p: 0.95,       // Giữ top_p cao để cân bằng
          frequency_penalty: 0.3,  // Tránh lặp lại
          presence_penalty: 0.3    // Khuyến khích nội dung mới
        };
        
        console.log('🤖 Calling OpenRouter with model:', routerModel);
        
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5000',
            'X-Title': 'Shop Bán Sách'
          },
          body: JSON.stringify(payload)
        });
        
        const data = await resp.json();
        console.log('📥 OpenRouter response status:', resp.status);
        console.log('📥 OpenRouter response data:', JSON.stringify(data, null, 2));
        
        // Check for errors in response
        if (data.error) {
          console.error('❌ OpenRouter API error:', data.error);
          throw new Error(data.error.message || 'OpenRouter API error');
        }
        
        // Extract AI response
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          aiResponse = data.choices[0].message.content;
        } else {
          console.error('Unexpected OpenRouter response format:', data);
          throw new Error('Invalid response format from OpenRouter');
        }
      } catch (e) {
        console.error('OpenRouter call error:', e);
        throw e;
      }
    } else {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.6,
        max_tokens: 800,
      });
      aiResponse = completion.choices[0].message.content;
    }

    // Save assistant reply to DB as well (if conversation exists)
    if (convIdForSave) {
      db.query('INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)', [convIdForSave, 'assistant', aiResponse], (ie) => {
        if (ie) console.error('Error saving assistant message to DB:', ie);
      });
    }

    // 🎯 TÌM VÀ TRẢ VỀ PRODUCTS từ database dựa trên AI response
    let recommendedProducts = [];
    
    // Extract product IDs từ AI response (tìm "ID: 123" hoặc "id: 123")
    const idMatches = aiResponse.match(/\b(?:ID|id):\s*(\d+)/gi);
    if (idMatches && idMatches.length > 0) {
      const ids = idMatches.map(m => parseInt(m.match(/\d+/)[0])).filter(id => !isNaN(id));
      
      if (ids.length > 0) {
        try {
          recommendedProducts = await new Promise((resolve, reject) => {
            const placeholders = ids.map(() => '?').join(',');
            db.query(
              `SELECT id, name, price, discount, author, img FROM product WHERE id IN (${placeholders}) LIMIT 8`,
              ids,
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
              }
            );
          });
          console.log('✅ Found products from AI response:', recommendedProducts.length);
        } catch (err) {
          console.error('Error fetching products by IDs:', err);
        }
      }
    }
    
    // Nếu AI không đề cập ID cụ thể, thử tìm theo từ khóa trong message
    if (recommendedProducts.length === 0) {
      const lowerMessage = message.toLowerCase();
      const categoryMap = {
        'ngôn tình': ['ngôn tình', 'tình cảm', 'lãng mạn', 'romance'],
        'lập trình': ['lập trình', 'code', 'javascript', 'python', 'react', 'node'],
        'văn học': ['văn học', 'tiểu thuyết', 'truyện'],
        'kinh tế': ['kinh tế', 'business', 'kinh doanh'],
      };
      
      for (const [category, keywords] of Object.entries(categoryMap)) {
        for (const keyword of keywords) {
          if (lowerMessage.includes(keyword)) {
            try {
              const searchTerms = keywords.map(k => `%${k}%`);
              const placeholders = keywords.map(() => '(name LIKE ? OR author LIKE ? OR description LIKE ?)').join(' OR ');
              const params = searchTerms.flatMap(term => [term, term, term]);
              
              recommendedProducts = await new Promise((resolve, reject) => {
                db.query(
                  `SELECT id, name, price, discount, author, img FROM product WHERE ${placeholders} LIMIT 5`,
                  params,
                  (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                  }
                );
              });
              console.log(`✅ Found ${recommendedProducts.length} products for category: ${category}`);
              break;
            } catch (err) {
              console.error('Error searching products:', err);
            }
          }
        }
        if (recommendedProducts.length > 0) break;
      }
    }

    res.json({ 
      response: aiResponse, 
      products: recommendedProducts,
      mode: 'ai' 
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Fallback nếu có lỗi
    const fallbackResponse = await getFallbackResponse(req.body.message || '');
    res.json({ 
      response: typeof fallbackResponse === 'object' ? fallbackResponse.text : fallbackResponse,
      products: typeof fallbackResponse === 'object' ? fallbackResponse.products : [],
      mode: 'fallback',
      error: error.message
    });
  }
});

// Fallback response function (rule-based with database search)
async function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('xin chào') || lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('chào')) {
    return {
      text: 'Xin chào! Rất vui được hỗ trợ bạn. Tôi có thể giúp bạn:\n• Tìm kiếm sách\n• Xem sách bán chạy\n• Giới thiệu khuyến mãi\n• Hỗ trợ mua hàng\n\nBạn cần giúp gì? 📚',
      products: []
    };
  }
  
  // KIỂM TRA THỂ LOẠI TRƯỚC (kể cả khi không có từ "tìm", "gợi ý")
  const categoryMap = {
    'ngôn tình': ['ngôn tình', 'tình cảm', 'lãng mạn', 'romance', 'yêu', 'love', 'tình yêu'],
    'lập trình': ['lập trình', 'code', 'coding', 'javascript', 'python', 'java', 'react', 'node', 'web', 'app', 'phát triển'],
    'văn học': ['văn học', 'tiểu thuyết', 'truyện', 'novel', 'fiction'],
    'kinh tế': ['kinh tế', 'business', 'kinh doanh', 'tài chính', 'đầu tư', 'marketing'],
    'kỹ năng': ['kỹ năng', 'skill', 'self-help', 'tự học', 'phát triển bản thân'],
    'thiếu nhi': ['thiếu nhi', 'trẻ em', 'kids', 'children', 'em bé'],
    'trinh thám': ['trinh thám', 'detective', 'thám tử', 'mystery'],
    'kinh dị': ['kinh dị', 'horror', 'ma', 'ghost', 'sợ hãi'],
    'khoa học': ['khoa học', 'science', 'vật lý', 'hóa học', 'sinh học']
  };
  
  let foundCategory = null;
  let searchKeywords = [];
  
  // Duyệt qua từng category và tìm match
  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        foundCategory = category;
        searchKeywords = keywords;
        break;
      }
    }
    if (foundCategory) break;
  }
  
  // Nếu tìm thấy category, tìm kiếm ngay
  if (foundCategory && searchKeywords.length > 0) {
    try {
      const searchTerms = searchKeywords.map(k => `%${k}%`);
      const placeholders = searchKeywords.map(() => '(name LIKE ? OR author LIKE ? OR description LIKE ?)').join(' OR ');
      const params = searchTerms.flatMap(term => [term, term, term]);
      
      const results = await new Promise((resolve, reject) => {
        db.query(
          `SELECT id, name, price, discount, author, img FROM product WHERE ${placeholders} LIMIT 8`,
          params,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      if (results.length > 0) {
        return {
          text: `Mình tìm thấy ${results.length} cuốn sách ${foundCategory} trong shop:`,
          products: results
        };
      } else {
        // Không tìm thấy sách với thể loại đó
        return {
          text: `Ối, shop mình chưa có sách ${foundCategory} ạ 😅\n\nNhưng mình có nhiều thể loại khác như:\n• 📚 Văn học\n• 💼 Kinh tế\n• 💻 Lập trình\n• 🎯 Kỹ năng\n\nBạn muốn xem thể loại nào không?`,
          products: []
        };
      }
    } catch (err) {
      console.error('Database search error:', err);
    }
  }
  
  // Search for books - TÌM KIẾM THEO TÊN SÁCH
  if (lowerMessage.includes('tìm') || lowerMessage.includes('có sách') || lowerMessage.includes('sách nào') || lowerMessage.includes('gợi ý') || lowerMessage.includes('giới thiệu') || lowerMessage.includes('muốn đọc')) {
    try {
      // TÌM KIẾM THEO TÊN SÁCH CỤ THỂ
      const words = lowerMessage.split(' ').filter(w => w.length > 2);
      let searchResults = [];
      
      // Nếu có từ dài hơn 3 ký tự, thử tìm kiếm theo tên
      for (const word of words) {
        if (word.length > 3 && !['tìm', 'sách', 'có', 'nào', 'gợi', 'giới', 'thiệu', 'kiếm', 'muốn', 'đọc'].includes(word)) {
          const searchTerm = `%${word}%`;
          const results = await new Promise((resolve, reject) => {
            db.query(
              'SELECT id, name, price, discount, author, img FROM product WHERE name LIKE ? OR author LIKE ? LIMIT 5',
              [searchTerm, searchTerm],
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
              }
            );
          });
          
          if (results.length > 0) {
            searchResults = results;
            break;
          }
        }
      }
      
      // Nếu tìm được sách cụ thể, trả về ngay
      if (searchResults.length > 0) {
        return {
          text: `Mình tìm thấy ${searchResults.length} cuốn sách phù hợp:`,
          products: searchResults
        };
      }
      
      // Nếu không tìm thấy, trả về hướng dẫn
      return {
        text: 'Mình chưa hiểu rõ bạn muốn tìm sách gì 🤔\n\nBạn có thể:\n• Nói tên sách hoặc tác giả\n• Nói thể loại (văn học, kinh tế, lập trình, ngôn tình...)\n• Xem sách bán chạy\n• Xem sách giảm giá\n\nHoặc hãy nói cụ thể hơn nhé! 📖',
        products: []
      };
    } catch (err) {
      console.error('Database search error:', err);
      return {
        text: 'Có lỗi xảy ra khi tìm kiếm. Bạn có thể xem tại trang Shop hoặc thử lại nhé! 😊',
        products: []
      };
    }
  }
  
  // Best sellers
  if (lowerMessage.includes('bán chạy') || lowerMessage.includes('phổ biến') || lowerMessage.includes('hot') || lowerMessage.includes('nổi bật')) {
    try {
      const results = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id, name, price, discount, sold, author, img FROM product WHERE sold > 0 ORDER BY sold DESC LIMIT 5',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      if (results.length > 0) {
        return {
          text: '🔥 Top sách bán chạy:',
          products: results
        };
      }
    } catch (err) {
      console.error('Database search error:', err);
    }
  }
  
  if (lowerMessage.includes('giá')) {
    return {
      text: 'Giá sách từ 50.000₫ - 500.000₫ tùy loại sách. Bạn muốn tìm trong khoảng giá nào? 💰',
      products: []
    };
  }
  
  if (lowerMessage.includes('khuyến mãi') || lowerMessage.includes('giảm giá') || lowerMessage.includes('sale')) {
    try {
      const results = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id, name, price, discount, img FROM product WHERE discount > 0 ORDER BY discount DESC LIMIT 5',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      if (results.length > 0) {
        return {
          text: '🎁 Sách đang giảm giá:',
          products: results
        };
      }
    } catch (err) {
      console.error('Database search error:', err);
    }
    return {
      text: '🎁 Khuyến mãi hiện tại:\n• Giảm 15% cho khách hàng mới\n• Freeship đơn từ 200.000₫\n• Nhiều sách đang giảm giá\n\nXem chi tiết tại trang Shop! 🎉',
      products: []
    };
  }
  
  if (lowerMessage.includes('liên hệ') || lowerMessage.includes('hotline') || lowerMessage.includes('địa chỉ') || lowerMessage.includes('email')) {
    return {
      text: '📞 Thông tin liên hệ:\n• Hotline: 0123-456-789\n• Email: support@shopbansach.com\n• Địa chỉ: 123 Nguyễn Huệ, Quận 1, TP.HCM\n• Giờ làm việc: 8:00 - 22:00 hàng ngày\n\nChúng tôi luôn sẵn sàng hỗ trợ bạn! 😊',
      products: []
    };
  }
  
  if (lowerMessage.includes('đổi trả') || lowerMessage.includes('chính sách') || lowerMessage.includes('hoàn tiền')) {
    return {
      text: '📋 Chính sách đổi trả:\n• Đổi/trả trong 7 ngày nếu lỗi in ấn\n• Hoàn tiền 100% nếu sản phẩm lỗi\n• Hỗ trợ đổi size/màu miễn phí\n\n📦 Chính sách giao hàng:\n• Nội thành: 1-2 ngày\n• Tỉnh/thành khác: 3-5 ngày\n• Freeship đơn từ 200.000đ\n\nCó gì thắc mắc, hãy hỏi tôi nhé! 😊',
      products: []
    };
  }
  
  if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment') || lowerMessage.includes('trả tiền')) {
    return {
      text: '💳 Phương thức thanh toán:\n• COD (Thanh toán khi nhận hàng)\n• Chuyển khoản ngân hàng\n• Ví điện tử (MoMo, ZaloPay)\n• Thẻ tín dụng/ghi nợ\n\nTất cả đều an toàn và bảo mật! 🔒',
      products: []
    };
  }
  
  // Tìm sách rẻ nhất
  if (lowerMessage.includes('rẻ nhất') || lowerMessage.includes('re nhat') || lowerMessage.includes('giá rẻ') || lowerMessage.includes('gia re')) {
    try {
      const results = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id, name, price, discount, author, img FROM product WHERE price > 0 ORDER BY price ASC LIMIT 5',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      if (results.length > 0) {
        return {
          text: '💰 5 cuốn sách giá rẻ nhất:',
          products: results
        };
      }
    } catch (err) {
      console.error('Database search error:', err);
    }
  }
  
  // Tìm sách đắt nhất
  if (lowerMessage.includes('đắt nhất') || lowerMessage.includes('dat nhat') || lowerMessage.includes('giá cao')) {
    try {
      const results = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id, name, price, discount, author, img FROM product WHERE price > 0 ORDER BY price DESC LIMIT 5',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      if (results.length > 0) {
        return {
          text: '💎 5 cuốn sách giá cao nhất:',
          products: results
        };
      }
    } catch (err) {
      console.error('Database search error:', err);
    }
  }
  
  // Câu hỏi chung (không liên quan đến sách)
  // Trả lời thân thiện và hướng về chủ đề sách
  return {
    text: 'Xin lỗi, tôi là trợ lý chuyên về sách nên không thể giúp bạn về câu hỏi này. 😅\n\nNhưng tôi có thể giúp bạn:\n• 📚 Tìm kiếm sách theo thể loại\n• 🔥 Xem sách bán chạy\n• 🎁 Sách đang khuyến mãi\n• 💰 Sách giá rẻ nhất\n• 📞 Thông tin liên hệ shop\n\nBạn muốn tìm loại sách nào? 😊',
    products: []
  };
}

// Contact form submission API
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  
  // Validate input
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng điền đầy đủ thông tin' 
    });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email không hợp lệ' 
    });
  }
  
  // Insert into database (create contacts table if not exists)
  db.query(
    `CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('new', 'read', 'replied') DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) {
        console.error('Error creating contacts table:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }
      
      // Insert contact message
      db.query(
        'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
        [name, email, subject, message],
        (insertErr) => {
          if (insertErr) {
            console.error('Error inserting contact:', insertErr);
            return res.status(500).json({ 
              success: false, 
              message: 'Không thể gửi tin nhắn. Vui lòng thử lại sau' 
            });
          }
          
          res.json({ 
            success: true, 
            message: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.' 
          });
        }
      );
    }
  );
});

// Admin: Get all contacts
app.get('/admin/contacts', authenticateAdmin, (req, res) => {
  const status = req.query.status;
  let query = 'SELECT * FROM contacts';
  const params = [];
  if (status && ['new', 'read', 'replied'].includes(status)) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching contacts:', err);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách liên hệ' });
    }
    res.json(results);
  });
});

// Admin: Update contact status
app.put('/admin/contacts/:id/status', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['new', 'read', 'replied'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }
  db.query('UPDATE contacts SET status = ? WHERE id = ?', [status, id], (err, result) => {
    if (err) {
      console.error('Error updating contact status:', err);
      return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy liên hệ' });
    }
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  });
});

// Admin: Delete contact
app.delete('/admin/contacts/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM contacts WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error deleting contact:', err);
      return res.status(500).json({ message: 'Lỗi khi xóa liên hệ' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy liên hệ' });
    }
    res.json({ success: true, message: 'Xóa liên hệ thành công' });
  });
});

// Admin: Get contacts statistics
app.get('/admin/contacts/stats', authenticateAdmin, (req, res) => {
  db.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
      SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied_count
    FROM contacts`,
    (err, results) => {
      if (err) {
        console.error('Error fetching contact stats:', err);
        return res.status(500).json({ message: 'Lỗi khi lấy thống kê' });
      }
      res.json(results[0]);
    }
  );
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
