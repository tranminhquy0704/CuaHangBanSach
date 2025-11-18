const jwt = require('jsonwebtoken');

const secret = 'your_jwt_secret';
const token = jwt.sign({ id: 1, role: 'admin' }, secret, { expiresIn: '24h' });
console.log('New token:', token);
