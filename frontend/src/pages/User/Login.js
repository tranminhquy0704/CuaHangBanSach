import React, { Fragment, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../Header';
import Footer from '../Footer';
import { toast } from 'react-toastify';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ email và mật khẩu.');
            return;
        }
        try {
            setLoading(true);
            const res = await axios.post('/auth/login', { email, password });
            const role = res.data?.role;
            const token = res.data?.token;
            setError('');
            if (token) localStorage.setItem('token', token);
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            if (role === 'admin') {
                const url = `http://localhost:5000/admin?token=${encodeURIComponent(token)}`;
                window.location.href = url;
                return;
            }
            localStorage.setItem('userEmail', email);
            toast.success('Đăng nhập thành công!');
            navigate('/index');
        } catch (err) {
            setError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    return (
        <Fragment>
            <Header />
            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '250px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Đăng nhập</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Đăng nhập</p>
                    </div>
                </div>
            </div>

            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-lg-6 col-md-8">
                        <div className="card shadow-sm border-0">
                            <div className="card-body p-4 p-lg-5">
                                <h3 className="mb-4 text-center">Đăng nhập tài khoản</h3>
                                <form onSubmit={handleLogin}>
                                    <div className="mb-3">
                                        <label htmlFor="loginEmail" className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="loginEmail"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="loginPassword" className="form-label">Mật khẩu</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-control"
                                                id="loginPassword"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                aria-label="Toggle password visibility"
                                            >
                                                <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="rememberMe"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="rememberMe">
                                                Ghi nhớ tài khoản
                                            </label>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-link p-0 small"
                                            onClick={() => toast.info('Vui lòng liên hệ hotline hoặc email hỗ trợ để đặt lại mật khẩu.')}
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    </div>
                                    {error && (
                                        <div className="alert alert-danger py-2" role="alert">
                                            {error}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 py-2"
                                        disabled={loading}
                                    >
                                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                                    </button>
                                </form>
                                <div className="text-center mt-3">
                                    <span className="text-muted">Chưa có tài khoản? </span>
                                    <Link to="/signup">Đăng ký ngay</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </Fragment>
    );
};

export default Login;