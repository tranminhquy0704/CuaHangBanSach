const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Kết nối MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       
    password: '',       
    database: 'login', 
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối cơ sở dữ liệu:', err);
    } else {
        console.log('Kết nối MySQL thành công!');
    }
});

// Đăng ký
app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    // Kiểm tra đầu vào
    if (!email || !password) {
        return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
    }

    // Kiểm tra người dùng đã tồn tại
    db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Lỗi SELECT:', err.message); // Log lỗi SELECT
            return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
        }

        // Lưu người dùng vào cơ sở dữ liệu
        db.query('INSERT INTO user (email, password) VALUES (?, ?)', [email, password], (err) => {
            if (err) {
                console.error('Lỗi INSERT:', err.message); // Log lỗi INSERT
                return res.status(500).json({ message: 'Lỗi lưu người dùng' });
            }
            res.status(201).json({ message: 'Đăng ký thành công!' });
        });
    });
});

// Đăng nhập
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Kiểm tra đầu vào
    if (!email || !password) {
        return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
    }

    // Kiểm tra người dùng tồn tại
    db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Lỗi SELECT:', err.message); // Log lỗi SELECT
            return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'Tên đăng nhập không đúng' });
        }

        const user = results[0];

        // So sánh mật khẩu
        if (password !== user.password) {
            return res.status(400).json({ message: 'Mật khẩu không đúng' });
        }

        // Tạo token
        const token = jwt.sign({ id: user.id, role: 'user' }, 'your_jwt_secret', { expiresIn: '1h' });
        res.status(200).json({ token });
    });
});

// Đăng nhập quản trị viên
app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;

    // Kiểm tra đầu vào
    if (!email || !password) {
        return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được để trống.' });
    }

    // Kiểm tra quản trị viên tồn tại
    db.query('SELECT * FROM admins WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Lỗi SELECT:', err.message); // Log lỗi SELECT
            return res.status(500).json({ message: 'Lỗi truy vấn cơ sở dữ liệu' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'Tên đăng nhập không đúng' });
        }

        const admin = results[0];

        // So sánh mật khẩu
        if (password !== admin.password) {
            return res.status(400).json({ message: 'Mật khẩu không đúng' });
        }

        // Tạo token
        const token = jwt.sign({ id: admin.id, role: 'admin' }, 'your_jwt_secret', { expiresIn: '1h' });
        res.status(200).json({ token });
    });
});

// Route để lấy tất cả sản phẩm
app.get('/api/products', (req, res) => {
    const query = 'SELECT * FROM product';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
        res.json(results);
    });
});

// Route để lấy sản phẩm theo id
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

// Route để thêm sản phẩm mới
app.post('/admin/products', (req, res) => {
    const { name, price, description, img } = req.body;

    if (!name || !price || !description || !img) {
        return res.status(400).json({ message: 'Missing product data' });
    }

    const query = 'INSERT INTO product (name, price, description, img) VALUES (?, ?, ?, ?)';
    db.query(query, [name, price, description, img], (err, results) => {
        if (err) {
            console.error('Error adding product:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(201).json({ message: 'Product added successfully', id: results.insertId });
    });
});

// Route để cập nhật sản phẩm
app.put('/admin/products/:id', (req, res) => {
    const productId = req.params.id;
    const { name, price, description, img } = req.body;

    console.log('Received product data:', { name, price, description, img });

    if (!name || !price || !description || !img) {
        return res.status(400).json({ message: 'Missing product data' });
    }

    const query = 'UPDATE product SET name = ?, price = ?, description = ?, img = ? WHERE id = ?';
    db.query(query, [name, price, description, img, productId], (err, results) => {
        if (err) {
            console.error('Error updating product:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        console.log('Product updated successfully');
        res.status(200).json({ message: 'Product updated successfully' });
    });
});

// Route để xóa sản phẩm
app.delete('/admin/products/:id', (req, res) => {
    const productId = req.params.id;

    const query = 'DELETE FROM product WHERE id = ?';
    db.query(query, [productId], (err, results) => {
        if (err) {
            console.error('Error deleting product:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    });
});

// Route để xử lý đặt hàng
app.post('/api/orders', (req, res) => {
    const { fullName, email, mobile, address, state, paymentMethod, total, cartItems } = req.body;

    // Kiểm tra đầu vào
    if (!fullName || !email || !mobile || !address || !state || !paymentMethod || !total || !cartItems) {
        return res.status(400).json({ message: 'Thiếu thông tin đặt hàng.' });
    }

    // Lưu thông tin đơn hàng vào cơ sở dữ liệu
    const query = 'INSERT INTO orders (fullName, email, mobile, address, state, paymentMethod, total, cartItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [fullName, email, mobile, address, state, paymentMethod, total, JSON.stringify(cartItems)], (err, results) => {
        if (err) {
            console.error('Error inserting order:', err);
            return res.status(500).json({ message: 'Lỗi khi lưu đơn hàng.' });
        }
        res.status(201).json({ message: 'Đơn hàng đã được đặt thành công.' });
    });
});

// Route để lấy tất cả đơn hàng
app.get('/api/orders', (req, res) => {
    const query = 'SELECT * FROM orders';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
        // Parse cartItems từ JSON string sang object
        results.forEach(order => {
            order.cartItems = JSON.parse(order.cartItems);
        });
        res.json(results);
    });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});