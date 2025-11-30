import React, { Fragment, useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Import useNavigate và useLocation
import Header from "./Header";
import Footer from "./Footer";
import axios from 'axios';
import { formatVND } from '../utils/currency';
import { toast } from 'react-toastify';
import { CartContext } from './CartContext';

function Shop() {
    const [products, setProducts] = useState([]); // State để lưu trữ danh sách sản phẩm
    const [categories, setCategories] = useState([]); // State để lưu trữ danh sách thể loại
    const [selectedCategory, setSelectedCategory] = useState(''); // State để lưu thể loại được chọn
    const [loading, setLoading] = useState(true);
    const [displaySettings, setDisplaySettings] = useState({
        products_per_page: 12,
        show_rating: true,
        show_sold: true
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [paginatedProducts, setPaginatedProducts] = useState([]);
    const [sortOption, setSortOption] = useState('newest'); // Sắp xếp: newest | best | price_asc | price_desc
    const navigate = useNavigate(); // Hook để điều hướng
    const location = useLocation(); // Hook để lấy query string từ URL
    const { addToCart: contextAddToCart } = useContext(CartContext);

    // Chuẩn hoá giá VND từ dữ liệu nguồn (string/number) -> số VND
    const parseVND = (val) => {
        if (val === null || val === undefined) return 0;
        const raw = String(val).trim();
        // Trường hợp dạng "119.00" hoặc "119,00"
        const decMatch = raw.match(/^(\d{1,3})[\.,](\d{2})$/);
        if (decMatch) {
            const i = parseInt(decMatch[1], 10);
            return i * 1000; // coi như nghìn VND
        }
        // Loại bỏ mọi ký tự không phải số
        const digits = raw.replace(/\D/g, '');
        if (!digits) return 0;
        let num = parseInt(digits, 10);
        // Nếu quá nhỏ (<= 999) giả định đơn vị nghìn
        if (num <= 999) num = num * 1000;
        return num;
    };

    // Helper: render stars based on rating (0-5)
    const renderStars = (rating = 0) => {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        const stars = [];
        for (let i = 0; i < full; i++) stars.push(<i key={`f${i}`} className="fas fa-star"></i>);
        if (half) stars.push(<i key="h" className="fas fa-star-half-alt"></i>);
        for (let i = 0; i < empty; i++) stars.push(<i key={`e${i}`} className="far fa-star"></i>);
        return stars;
    };

    // Helper: format sold count like 1.2k
    const formatSold = (n = 0) => {
        if (n >= 1000) return (Math.round((n / 1000) * 10) / 10) + 'k';
        return String(n);
    };

    // Fetch display settings
    useEffect(() => {
        axios.get('/api/settings')
            .then(response => {
                if (response.data && typeof response.data === 'object') {
                    const settings = {};
                    Object.keys(response.data).forEach(key => {
                        settings[key] = response.data[key].value || '';
                    });
                    setDisplaySettings({
                        products_per_page: parseInt(settings['display.products_per_page']) || 12,
                        show_rating: settings['display.show_rating'] === 'true',
                        show_sold: settings['display.show_sold'] === 'true'
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching display settings:', error);
            });
    }, []);

    // Fetch categories
    useEffect(() => {
        axios.get('/api/categories')
            .then(response => {
                setCategories(response.data || []);
            })
            .catch(error => {
                console.error('Error fetching categories:', error);
            });
    }, []);

    // Lấy danh sách sản phẩm từ server khi component được tải hoặc khi search query thay đổi
    useEffect(() => {
        // Lấy query string search từ URL
        const searchParams = new URLSearchParams(location.search);
        const searchQuery = searchParams.get('search') || '';
        
        console.log('[Shop] Search query from URL:', searchQuery);
        console.log('[Shop] Full location.search:', location.search);
        
        setLoading(true);
        
        // Gọi API với query string search nếu có
        const url = searchQuery ? `/api/products?search=${encodeURIComponent(searchQuery)}` : '/api/products';
        
        console.log('[Shop] Calling API:', url);
        
        axios.get(url)
            .then(response => {
                console.log('[Shop] Received products:', response.data?.length || 0);
                setProducts(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Lỗi khi lấy danh sách sản phẩm:', error);
                setLoading(false);
            });
    }, [location.search]); // Chạy lại khi query string thay đổi

    // Pagination + sort + filter logic
    useEffect(() => {
        // Filter by category first
        let filtered = [...products];
        if (selectedCategory) {
            filtered = filtered.filter(p => p.category_id && Number(p.category_id) === Number(selectedCategory));
        }

        // Copy ra mảng mới để sort không làm thay đổi state gốc
        let sorted = [...filtered];

        // Sắp xếp theo option
        sorted.sort((a, b) => {
            const priceA = parseVND(a.price);
            const priceB = parseVND(b.price);
            const soldA = Number(a.sold) || 0;
            const soldB = Number(b.sold) || 0;

            switch (sortOption) {
                case 'best': // Bán chạy (tạm dùng tổng sold)
                    return soldB - soldA;
                case 'price_asc': // Giá tăng dần
                    return priceA - priceB;
                case 'price_desc': // Giá giảm dần
                    return priceB - priceA;
                case 'newest': // Mới nhất (id lớn hơn mới hơn)
                default:
                    return (Number(b.id) || 0) - (Number(a.id) || 0);
            }
        });

        const startIndex = (currentPage - 1) * displaySettings.products_per_page;
        const endIndex = startIndex + displaySettings.products_per_page;
        setPaginatedProducts(sorted.slice(startIndex, endIndex));
    }, [products, currentPage, displaySettings.products_per_page, sortOption, selectedCategory]);

    // Hàm thêm sản phẩm vào giỏ hàng
    const addToCart = (product) => {
        const userEmail = localStorage.getItem("userEmail"); // Kiểm tra trạng thái đăng nhập
        if (!userEmail) {
            toast.info('Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng');
            navigate('/login');
            return;
        }
        // Cập nhật qua CartContext để Header badge cập nhật ngay
        contextAddToCart({ ...product, quantity: 1 });
        toast.success('Đã thêm vào giỏ hàng');
    };

    return (
        <Fragment>
            <Header />

            <div className="container-fluid bg-secondary mb-5">
                <div
                    className="d-flex flex-column align-items-center justify-content-center"
                    style={{ minHeight: '300px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">
                        {new URLSearchParams(location.search).get('search') ? 'Kết quả tìm kiếm' : 'Cửa hàng'}
                    </h1>
                    {new URLSearchParams(location.search).get('search') && (
                        <p className="mb-3 text-muted">
                            Tìm thấy {products.length} sản phẩm cho từ khóa: <strong>"{new URLSearchParams(location.search).get('search')}"</strong>
                        </p>
                    )}
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Cửa hàng</p>
                    </div>
                </div>
            </div>

            {!loading && products.length === 0 && new URLSearchParams(location.search).get('search') && (
                <div className="container-fluid mb-5">
                    <div className="text-center py-5">
                        <i className="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4 className="text-muted">Không tìm thấy sản phẩm nào</h4>
                        <p className="text-muted">Vui lòng thử lại với từ khóa khác</p>
                    </div>
                </div>
            )}

            {/* Thanh lọc và sắp xếp */}
            <div className="container-fluid mb-4">
                <div className="row px-xl-5">
                    <div className="col-12">
                        <div className="d-flex align-items-center gap-4 flex-wrap">
                            <div className="d-flex align-items-center">
                                <label className="text-dark mb-0 me-3" style={{ minWidth: '80px', fontWeight: '600' }}>
                                    <i className="fa fa-th-list me-2 text-primary"></i>
                                    Thể loại:
                                </label>
                                <select
                                    className="form-select"
                                    style={{ 
                                        width: '250px',
                                        borderColor: '#ddd',
                                        fontSize: '14px',
                                        padding: '8px 16px'
                                    }}
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Tất cả thể loại</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="d-flex align-items-center">
                                <label className="text-dark mb-0 me-3" style={{ minWidth: '100px', fontWeight: '600' }}>
                                    <i className="fa fa-sort-amount-down me-2 text-primary"></i>
                                    Sắp xếp theo:
                                </label>
                                <select
                                    className="form-select"
                                    style={{ 
                                        width: '250px',
                                        borderColor: '#ddd',
                                        fontSize: '14px',
                                        padding: '8px 16px'
                                    }}
                                    value={sortOption}
                                    onChange={(e) => {
                                        setSortOption(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="newest">Mới nhất</option>
                                    <option value="best">Bán chạy</option>
                                    <option value="price_asc">Giá thấp đến cao</option>
                                    <option value="price_desc">Giá cao đến thấp</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Skeleton loading when fetching */}
                {loading && (
                    [...Array(8)].map((_, idx) => (
                        <div className="col-lg-2 col-md-3 col-sm-6 pb-1" key={`sk-${idx}`}>
                            <div className="skeleton-card">
                                <div className="skeleton-thumb"></div>
                                <div className="skeleton-line" style={{width:'80%'}}></div>
                                <div className="skeleton-line" style={{width:'40%'}}></div>
                            </div>
                        </div>
                    ))
                )}

                {!loading && paginatedProducts.map((product) => {
                    const priceNumber = parseVND(product.price);
                    // Tính giá sau khi giảm nếu có discount
                    const discountPercent = Number(product.discount) || 0;
                    const finalPrice = discountPercent > 0 
                        ? Math.max(0, Math.round(priceNumber * (1 - discountPercent / 100)))
                        : priceNumber;
                    const priceFormatted = formatVND(finalPrice);
                    
                    return (
                        <div className="col-lg-2 col-md-3 col-sm-6 pb-1" key={product.id}>
                            <div className="card product-item border-0 mb-4">
                                <a href={`/shopdetail/${product.id}`} className="card-header product-img position-relative overflow-hidden bg-transparent border p-0 d-block">
                                    {/* Optional badge if product has discount or isNew */}
                                    {Number(product.discount) > 0 && (
                                        <span className="product-badge badge-sale">-{product.discount}%</span>
                                    )}
                                    {!!product.isNew && !(Number(product.discount) > 0) && (
                                        <span className="product-badge badge-new">Mới</span>
                                    )}
                                    <img className="img-fluid w-100" src={product.img} alt={product.name} />
                                </a>
                                <div className="card-body border-left border-right text-center p-0 pt-3 pb-3">
                                    <h6 className="product-title mb-2">
                                        <a href={`/shopdetail/${product.id}`} className="text-dark">{product.name}</a>
                                    </h6>
                                    <div className="d-flex justify-content-center align-items-center" style={{gap: '8px'}}>
                                        <h6 className="price-text mb-0">{priceFormatted}</h6>
                                        {(() => {
                                            const hasData = !!product.oldPrice || !!product.discount;
                                            const demo = !hasData && process.env.NODE_ENV !== 'production';
                                            const old = product.oldPrice
                                              ? parseVND(product.oldPrice)
                                              : (product.discount ? priceNumber : (demo ? Math.round(priceNumber / 0.8) : null));
                                            if (!old || !isFinite(old) || old <= finalPrice) return null;
                                            return (
                                                <small>
                                                    <del className="text-muted">{formatVND(old)}</del>
                                                </small>
                                            );
                                        })()}
                                    </div>
                                    {(displaySettings.show_rating || displaySettings.show_sold) && (
                                        <div className="d-flex justify-content-center align-items-center gap-2 mt-1" style={{columnGap:'8px'}}>
                                            {displaySettings.show_rating && Number(product.rating_count) > 0 && (
                                                <div className="rating-stars text-warning" aria-label={`Đánh giá ${Number(product.rating)} trên 5`}>
                                                    {renderStars(Number(product.rating) || 0)}
                                                </div>
                                            )}
                                            {displaySettings.show_sold && (
                                                <small className="text-muted">Đã bán {formatSold(Number(product.sold) || 0)}</small>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="card-footer d-flex justify-content-between bg-light border">
                                    <a href="/"
                                        className="btn btn-sm text-dark p-0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            addToCart(product);
                                        }}>
                                        <i className="fas fa-shopping-cart text-primary mr-1"></i> Thêm vào giỏ hàng
                                    </a>
                                    <a href={`/shopdetail/${product.id}`} className="btn btn-sm text-dark p-0">
                                        <i className="fas fa-eye text-primary mr-1"></i> Chi tiết
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Pagination */}
            {!loading && products.length > displaySettings.products_per_page && (
                <div className="d-flex justify-content-center mt-4 mb-5">
                    <nav>
                        <ul className="pagination">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                                    Trước
                                </button>
                            </li>
                            {Array.from({ length: Math.ceil(products.length / displaySettings.products_per_page) }, (_, i) => i + 1).map(page => (
                                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                                        {page}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage >= Math.ceil(products.length / displaySettings.products_per_page) ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(products.length / displaySettings.products_per_page), prev + 1))}>
                                    Sau
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}
            
            <Footer />
        </Fragment>
    );
}

export default Shop;