import React, { Fragment, useContext } from 'react';
import { CartContext } from './CartContext'; // Import CartContext
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

function Header() {
    const { cartCount } = useContext(CartContext); // Lấy số lượng giỏ hàng từ context
    const [userEmail, setUserEmail] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [storeName, setStoreName] = useState('BookStore');
    const navigate = useNavigate();

    useEffect(() => {
        const email = localStorage.getItem('userEmail');
        setUserEmail(email || '');
        
        // Fetch store name from settings
        axios.get('/api/settings')
            .then(response => {
                if (response.data && response.data['store.name']) {
                    setStoreName(response.data['store.name'].value || 'BookStore');
                }
            })
            .catch(error => {
                console.error('Error fetching store name:', error);
            });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('token');
        setUserEmail('');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (query) {
            // Chuyển đến trang shop với query string search
            navigate(`/shop?search=${encodeURIComponent(query)}`);
        } else {
            // Nếu không có query, chỉ chuyển đến shop
            navigate('/shop');
        }
    };

    return (
        <Fragment>
            {/* Header hiện đại, gọn 1 tầng, sticky */}
            <header className="shop-header sticky-top bg-white shadow-sm">
                <div className="container-fluid px-3 px-md-4">
                    <div className="row align-items-center py-3 no-gutters">
                        {/* Logo */}
                        <div className="col-auto d-flex align-items-center">
                            <Link to="/" className="d-inline-flex align-items-center text-decoration-none">
                                <img src="/assets/img/logo.jpg" alt={storeName} className="logo-img mr-2" />
                                <span className="h4 mb-0 font-weight-bold text-dark d-none d-md-inline">{storeName}</span>
                            </Link>
                        </div>

                        {/* Tabs điều hướng (ẩn ở màn hình nhỏ) */}
                        <div className="d-none d-lg-block col-auto">
                            <ul className="navbar-nav flex-row nav-tabs-modern">
                                <li className="nav-item px-2">
                                    <Link to="/" className="nav-link nav-link-modern">Trang chủ</Link>
                                </li>
                                <li className="nav-item px-2">
                                    <Link to="/shop" className="nav-link nav-link-modern">Cửa hàng</Link>
                                </li>
                                <li className="nav-item px-2">
                                    <Link to="/contact" className="nav-link nav-link-modern">Liên hệ</Link>
                                </li>
                                <li className="nav-item px-2">
                                    <Link to="/vouchers" className="nav-link nav-link-modern">Kho voucher</Link>
                                </li>
                            </ul>
                        </div>

                        {/* Ô tìm kiếm (chiều rộng linh hoạt chiếm phần còn lại) */}
                        <div className="col d-flex">
                            <form onSubmit={handleSearch} className="search-form" style={{ width: '100%' }}>
                                <div className="input-group search-wrap">
                                    <input 
                                        type="text" 
                                        className="form-control search-input" 
                                        placeholder="Tìm kiếm sách, tác giả, nhà xuất bản..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <div className="input-group-append">
                                        <button type="submit" className="btn btn-primary search-btn" title="Tìm kiếm">
                                            <i className="fa fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Hành động bên phải (đẩy sát phải) */}
                        <div className="col-auto d-flex align-items-center right-actions ml-auto">
                            {/* Giỏ hàng đặt bên trong (gần thanh tìm kiếm) */}
                            <Link to="/cart" className="icon-btn position-relative mr-2" title="Giỏ hàng">
                                <i className="fas fa-shopping-cart"></i>
                                <span className="cart-badge">{cartCount}</span>
                            </Link>
                            {/* Tài khoản (đặt ngoài cùng bên phải) */}
                            <div className="dropdown d-none d-md-inline-flex">
                                <button className="icon-btn dropdown-toggle" id="accountDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Tài khoản">
                                    <i className="fas fa-user"></i>
                                </button>
                                <div className="dropdown-menu dropdown-menu-right dropdown-menu-modern" aria-labelledby="accountDropdown">
                                    {userEmail ? (
                                        <div className="px-3 py-2">
                                            <div className="mb-2">Xin chào, <strong>{userEmail}</strong></div>
                                            <Link to="/my-orders" className="btn btn-outline-primary btn-sm w-100 mb-2">
                                                <i className="fas fa-shopping-bag me-1"></i>Đơn hàng của tôi
                                            </Link>
                                            <button className="btn btn-outline-secondary btn-sm w-100" onClick={handleLogout}>Đăng xuất</button>
                                        </div>
                                    ) : (
                                        <div className="px-3 py-2 d-flex">
                                            <Link className="btn btn-light btn-sm mr-2" to="/login">Đăng nhập</Link>
                                            <Link className="btn btn-primary btn-sm text-white" to="/signup">Đăng ký</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </Fragment>
    );
}

export default Header;

