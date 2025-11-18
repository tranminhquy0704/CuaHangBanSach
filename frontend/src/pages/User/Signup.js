import React, { Fragment, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../Header';
import Footer from '../Footer';
import { toast } from 'react-toastify';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();

        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Vui lòng điền đầy đủ thông tin.');
            setSuccess('');
            return;
        }
        if (email.length < 3 || email.length > 50) {
            setError('Tên đăng nhập phải từ 3-50 ký tự.');
            setSuccess('');
            return;
        }
        if (password.length < 6) {
            setError('Mật khẩu phải dài ít nhất 6 ký tự.');
            setSuccess('');
            return;
        }
        if (password !== confirmPassword) {
            setError('Mật khẩu và xác nhận mật khẩu không khớp.');
            setSuccess('');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post('/signup', { email, password });
            setSuccess(response.data.message || 'Đăng ký thành công!');
            setError('');
            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra trong quá trình đăng ký.');
            setSuccess('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fragment>
            <Header />
            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '250px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Đăng ký</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Đăng ký</p>
                    </div>
                </div>
            </div>

            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-lg-6 col-md-8">
                        <div className="card shadow-sm border-0">
                            <div className="card-body p-4 p-lg-5">
                                <h3 className="mb-4 text-center">Tạo tài khoản mới</h3>
                                <form onSubmit={handleSignUp}>
                                    <div className="mb-3">
                                        <label htmlFor="signupEmail" className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="signupEmail"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                        />
                                        <small className="text-muted">Chúng tôi sẽ gửi thông báo đơn hàng qua email này.</small>
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="signupPassword" className="form-label">Mật khẩu</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-control"
                                                id="signupPassword"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
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
                                        <small className="text-muted">Tối thiểu 6 ký tự gồm chữ và số.</small>
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="signupConfirmPassword" className="form-label">Xác nhận mật khẩu</label>
                                        <div className="input-group">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="form-control"
                                                id="signupConfirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Nhập lại mật khẩu"
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                aria-label="Toggle confirm password visibility"
                                            >
                                                <i className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    {error && (
                                        <div className="alert alert-danger py-2" role="alert">
                                            {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div className="alert alert-success py-2" role="alert">
                                            {success}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 py-2"
                                        disabled={loading}
                                    >
                                        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                                    </button>
                                </form>
                                <div className="text-center mt-3">
                                    <span className="text-muted">Đã có tài khoản? </span>
                                    <Link to="/login">Đăng nhập ngay</Link>
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

export default Signup;