import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Box, Typography, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
    // Khởi tạo trạng thái cho email, password và error
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Sử dụng useNavigate để điều hướng trang

    // Hàm xử lý đăng nhập
    const handleLogin = async (e) => {
        e.preventDefault(); // Ngăn chặn hành động mặc định của form
        try {
            // Gửi yêu cầu đăng nhập đến server
            const response = await axios.post('/admin/login', { email, password });
            const token = response.data.token; // Lấy token từ phản hồi của server
            localStorage.setItem('token', token); // Lưu token vào localStorage
            navigate('/admin/dashboard'); // Chuyển hướng đến trang dashboard sau khi đăng nhập thành công
        } catch (error) {
            // Hiển thị thông báo lỗi nếu có lỗi xảy ra
            setError('Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Đăng nhập quản trị viên
                </Typography>
                <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Mật khẩu"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {/* Hiển thị thông báo lỗi nếu có */}
                    {error && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Đăng nhập
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default AdminLogin;