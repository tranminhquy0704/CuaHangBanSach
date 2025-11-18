import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Menu() {
    const [userEmail, setUserEmail] = useState('');
    // Lấy email người dùng từ localStorage
    useEffect(() => {
        const email = localStorage.getItem('userEmail');
        if (email) {
            setUserEmail(email);
        } else {
            setUserEmail('');
        }
    }, []);
     // Hàm xử lý đăng xuất
    const handleLogout = () => {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('token');
        setUserEmail('');
    };

    return (
        <nav className="shop-navbar navbar navbar-expand-lg navbar-light">
            <div className="container">
                <button
                    className="navbar-toggler border-0"
                    type="button"
                    data-toggle="collapse"
                    data-target="#navbarMain"
                    aria-controls="navbarMain"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarMain">
                    {/* Tabs trung tâm, bỏ logo để tránh trùng với header trên */}
                    <ul className="navbar-nav mx-auto nav-tabs-modern">
                        <li className="nav-item">
                            <Link to="/" className="nav-link nav-link-modern">Trang chủ</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/shop" className="nav-link nav-link-modern">Cửa hàng</Link>
                        </li>
                        <li className="nav-item dropdown">
                            <a
                                className="nav-link nav-link-modern dropdown-toggle"
                                href="/"
                                id="navbarDropdown"
                                role="button"
                                data-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                            >
                                Trang
                            </a>
                            <div className="dropdown-menu dropdown-menu-modern" aria-labelledby="navbarDropdown">
                                <Link to="/cart" className="dropdown-item">Giỏ hàng</Link>
                                <Link to="/checkout" className="dropdown-item">Thanh toán</Link>
                                <Link to="/vouchers" className="dropdown-item">Kho voucher</Link>
                            </div>
                        </li>
                        <li className="nav-item">
                            <Link to="/contact" className="nav-link nav-link-modern">Liên hệ</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/vouchers" className="nav-link nav-link-modern d-lg-none">Kho voucher</Link>
                        </li>
                    </ul>

                    {/* Khu vực tài khoản bên phải */}
                    <ul className="navbar-nav ml-lg-0">
                        {userEmail ? (
                            <>
                                <li className="nav-item d-flex align-items-center pr-2">
                                    <span className="nav-text-muted">Xin chào, <strong>{userEmail}</strong></span>
                                </li>
                                <li className="nav-item">
                                    <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={handleLogout}>
                                        Đăng xuất
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="nav-item pr-2">
                                    <Link to="/login" className="btn btn-light btn-sm rounded-pill">Đăng nhập</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/signup" className="btn btn-primary btn-sm rounded-pill text-white">Đăng ký</Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Menu;