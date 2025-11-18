import React, { Fragment, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import Header from './Header';
import Footer from './Footer';
import axios from 'axios';
import { parseVND, formatVND } from '../utils/currency';
import { toast } from 'react-toastify';

function ShopDetail() {
    const { id } = useParams(); 
    const { addToCart: contextAddToCart } = useContext(CartContext);
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedRating, setSelectedRating] = useState(0);
    const navigate = useNavigate();

    // Gọi API để lấy thông tin sản phẩm
    useEffect(() => {
        axios.get(`/api/products/${id}`)
            .then(response => {
                setProduct(response.data);
            })
            .catch(error => {
                console.error('Error fetching product:', error);
            });
    }, [id]);
    // Hàm để thay đổi số lượng sản phẩm
    const handleQuantityChange = (type) => {
        if (type === 'increase') {
            setQuantity(quantity + 1);
        } else if (type === 'decrease' && quantity > 1) {
            setQuantity(quantity - 1);
        }
    };
    // Hàm để thêm sản phẩm vào giỏ hàng
    const handleAddToCart = () => {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
            toast.info('Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng');
            navigate('/login');
            return;
        }

        contextAddToCart({ ...product, quantity });
        toast.success('Đã thêm vào giỏ hàng');
    };
    // Hiển thị thông báo nếu không tìm thấy sản phẩm
    if (!product) {
        return (
            <Fragment>
                <Header />
                <div className="container text-center my-5">
                    <h1 className="text-danger">Product Not Found</h1>
                    <p>The product you are looking for does not exist.</p>
                    <a href="/" className="btn btn-primary">Back to Shop</a>
                </div>
                <Footer />
            </Fragment>
        );
    }

    return (
        <Fragment>
            <Header />

            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Chi tiết sản phẩm</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">{product.name}</p>
                    </div>
                </div>
            </div>

            <div className="container py-5">
                <div className="row">
                    <div className="col-md-4 mb-4">
                        <img src={product.img} className="img-fluid" alt={product.name} />
                    </div>
                    <div className="col-md-8">
                        <h2 className="mb-3">{product.name}</h2>
                        {/* Info lines under title */}
                        <div className="mb-3">
                            <div className="row">
                                <div className="col-md-6">
                                    <p className="mb-1">
                                        <span className="text-muted">Nhà cung cấp: </span>
                                        <span className="text-primary fw-semibold">{product.supplier || 'Đang cập nhật'}</span>
                                    </p>
                                    <p className="mb-1">
                                        <span className="text-muted">Nhà xuất bản: </span>
                                        <span className="fw-semibold text-dark">{product.publisher || 'Đang cập nhật'}</span>
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <p className="mb-1">
                                        <span className="text-muted">Tác giả: </span>
                                        <span className="fw-semibold text-dark">{product.author || 'Đang cập nhật'}</span>
                                    </p>
                                    <p className="mb-1">
                                        <span className="text-muted">Hình thức bìa: </span>
                                        <span className="fw-semibold text-dark">{product.coverType || 'Bìa mềm'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="me-3">
                                        <span className="text-warning">
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star"></i>
                                            <i className="far fa-star"></i>
                                        </span>
                                        <span className="ms-2 text-muted">(0 đánh giá)</span>
                                    </div>
                                    <div className="vr"></div>
                                    <div className="mx-3">
                                        <span className="text-muted">Đã bán: </span>
                                        <strong>{product.sold || 0}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="bg-light p-3 mb-4 rounded">
                                    <div className="d-flex align-items-baseline mb-2 gap-3">
                                        <h3 className="price-current mb-0">{formatVND(parseVND(product.price))}</h3>
                                        {(() => {
                                            const price = parseVND(product.price);
                                            const hasData = !!product.oldPrice || !!product.discount;
                                            const demo = !hasData && process.env.NODE_ENV !== 'production';
                                            const old = product.oldPrice
                                              ? parseVND(product.oldPrice)
                                              : (product.discount ? Math.round(price / (1 - product.discount / 100)) : (demo ? Math.round(price / 0.8) : null));
                                            if (!old || !isFinite(old) || old <= price) return null;
                                            const percent = Math.max(0, Math.round((1 - price / old) * 100));
                                            return (
                                                <div className="d-inline-flex align-items-baseline ms-3" style={{gap: '10px'}}>
                                                    <span className="price-old">{formatVND(old)}</span>
                                                    <span className="discount-badge">-{percent}%</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="d-flex align-items-center mb-4">
                                    <div className="input-group input-group-sm me-3" style={{ width: '120px' }}>
                                        <button 
                                            className="btn btn-outline-secondary btn-sm" 
                                            onClick={() => handleQuantityChange('decrease')}
                                        >
                                            <i className="fas fa-minus"></i>
                                        </button>
                                        <input 
                                            type="text" 
                                            className="form-control form-control-sm text-center" 
                                            value={quantity} 
                                            readOnly 
                                        />
                                        <button 
                                            className="btn btn-outline-secondary btn-sm" 
                                            onClick={() => handleQuantityChange('increase')}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    <button 
                                        className="btn btn-danger btn-sm px-3 me-2"
                                        onClick={handleAddToCart}
                                    >
                                        <i className="fas fa-shopping-cart me-2"></i>
                                        Thêm vào giỏ hàng
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                <div className="row mt-4">
                    <div className="col-12">
                        <h4 className="mb-3">Mô tả sản phẩm</h4>
                        <div className="bg-light p-3 rounded">
                            <p className="mb-0">{product.description || 'Đang cập nhật mô tả sản phẩm.'}</p>
                        </div>
                    </div>
                </div>
                {/* Review Section */}
                <div className="row mt-5">
                    <div className="col-12">
                        <h4 className="mb-4">Đánh giá sản phẩm</h4>
                        
                        {/* Rating Summary */}
                        <div className="row mb-4">
                            <div className="col-md-3 text-center">
                                <h1 className="text-warning mb-0">4.5</h1>
                                <div className="mb-2">
                                    <i className="fas fa-star text-warning"></i>
                                    <i className="fas fa-star text-warning"></i>
                                    <i className="fas fa-star text-warning"></i>
                                    <i className="fas fa-star text-warning"></i>
                                    <i className="far fa-star text-warning"></i>
                                </div>
                                <p className="text-muted">(0 đánh giá)</p>
                            </div>
                            <div className="col-md-9">
                                {[5, 4, 3, 2, 1].map((star) => (
                                    <div key={star} className="d-flex align-items-center mb-2">
                                        <div className="text-nowrap me-2" style={{width: '50px'}}>
                                            {star} <i className="fas fa-star text-warning"></i>
                                        </div>
                                        <div className="progress flex-grow-1" style={{height: '8px'}}>
                                            <div 
                                                className="progress-bar bg-warning" 
                                                style={{
                                                    width: `${(star === 5 ? 70 : star === 4 ? 15 : star === 3 ? 10 : star === 2 ? 5 : 0)}%`
                                                }}
                                            ></div>
                                        </div>
                                        <div className="ms-2 text-muted" style={{width: '30px'}}>
                                            {star === 5 ? '70%' : star === 4 ? '15%' : star === 3 ? '10%' : star === 2 ? '5%' : '0%'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Chọn đánh giá của bạn</label>
                            <div className="mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <i
                                        key={star}
                                        className={`${star <= selectedRating ? 'fas' : 'far'} fa-star text-warning me-1`}
                                        style={{fontSize: '1.5rem', cursor: 'pointer'}}
                                        onClick={() => {
                                            if (!localStorage.getItem('userEmail')) {
                                                toast.info('Bạn cần đăng nhập để đánh giá');
                                                navigate('/login');
                                                return;
                                            }
                                            setSelectedRating(star);
                                            axios.post(`/api/products/${id}/rating`, { stars: star })
                                              .then(res => {
                                                if (res?.data?.rating != null) {
                                                  setProduct(prev => ({ ...prev, rating: res.data.rating }));
                                                }
                                                toast.success(`Bạn đã đánh giá ${star} sao`);
                                              })
                                              .catch(() => {
                                                toast.error('Không thể gửi đánh giá lúc này');
                                              });
                                        }}
                                    ></i>
                                ))}
                            </div>
                        </div>

                        {/* Write Review Button */}
                        <div className="mb-4 d-none">
                            <button 
                                className="btn btn-primary"
                                onClick={() => {
                                    if (!localStorage.getItem('userEmail')) {
                                        if (window.confirm('Bạn cần đăng nhập để viết đánh giá. Đi đến trang đăng nhập?')) {
                                            navigate('/login');
                                        }
                                    } else {
                                        // Open review form
                                        document.getElementById('reviewForm').scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                            >
                                <i className="fas fa-pen me-2"></i>Viết đánh giá
                            </button>
                        </div>

                        {/* Reviews List */}
                        <div className="border-top pt-4 d-none">
                            <h5 className="mb-4">Đánh giá mới nhất</h5>
                            
                            {/* Sample Review 1 */}
                            <div className="mb-4 pb-4 border-bottom">
                                <div className="d-flex justify-content-between mb-2">
                                    <div>
                                        <span className="fw-bold">Nguyễn Văn A</span>
                                        <span className="text-muted ms-2">- 2 ngày trước</span>
                                    </div>
                                    <div>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="far fa-star text-warning"></i>
                                    </div>
                                </div>
                                <h6>Rất hài lòng</h6>
                                <p className="mb-2">Sách đẹp, đóng gói cẩn thận, giao hàng nhanh. Nội dung rất hay và bổ ích.</p>
                                <div className="d-flex">
                                    <button className="btn btn-sm btn-outline-secondary me-2">
                                        <i className="far fa-thumbs-up me-1"></i>Hữu ích (5)
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary">
                                        <i className="far fa-comment me-1"></i>Bình luận (2)
                                    </button>
                                </div>
                            </div>

                            {/* Sample Review 2 */}
                            <div className="mb-4 pb-4 border-bottom">
                                <div className="d-flex justify-content-between mb-2">
                                    <div>
                                        <span className="fw-bold">Trần Thị B</span>
                                        <span className="text-muted ms-2">- 1 tuần trước</span>
                                    </div>
                                    <div>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="fas fa-star text-warning"></i>
                                        <i className="far fa-star text-warning"></i>
                                        <i className="far fa-star text-warning"></i>
                                    </div>
                                </div>
                                <h6>Tạm được</h6>
                                <p className="mb-2">Sách hơi cũ, bìa bị gập góc. Nhưng nội dung vẫn đầy đủ, đọc được.</p>
                                <div className="d-flex">
                                    <button className="btn btn-sm btn-outline-secondary me-2">
                                        <i className="far fa-thumbs-up me-1"></i>Hữu ích (2)
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary">
                                        <i className="far fa-comment me-1"></i>Bình luận (0)
                                    </button>
                                </div>
                            </div>

                            {/* Review Form (Hidden by default) */}
                            <div id="reviewForm" className="mt-5 p-4 bg-light rounded d-none">
                                <h5 className="mb-4">Viết đánh giá của bạn</h5>
                                <div className="mb-3">
                                    <label className="form-label">Đánh giá của bạn về sản phẩm này</label>
                                    <div className="mb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <i key={star} className="far fa-star text-warning me-1" style={{fontSize: '1.5rem', cursor: 'pointer'}}></i>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="reviewTitle" className="form-label">Tiêu đề đánh giá</label>
                                    <input type="text" className="form-control" id="reviewTitle" placeholder="Ví dụ: Rất hài lòng" />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="reviewContent" className="form-label">Nội dung đánh giá</label>
                                    <textarea className="form-control" id="reviewContent" rows="4" placeholder="Chia sẻ thêm một số cảm nhận về sản phẩm..."></textarea>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Hình ảnh đính kèm (tối đa 5 ảnh)</label>
                                    <div className="border rounded p-3 text-center">
                                        <i className="fas fa-camera fa-2x text-muted mb-2"></i>
                                        <p className="text-muted mb-0">Thêm ảnh</p>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-end">
                                    <button className="btn btn-outline-secondary me-2">Hủy</button>
                                    <button className="btn btn-primary">Gửi đánh giá</button>
                                </div>
                            </div>

                            {/* Pagination */}
                            <nav aria-label="Page navigation" className="mt-4 d-none">
                                <ul className="pagination justify-content-center">
                                    <li className="page-item disabled">
                                        <a className="page-link" href="#" tabIndex="-1" aria-disabled="true">Trước</a>
                                    </li>
                                    <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                    <li className="page-item"><a className="page-link" href="#">2</a></li>
                                    <li className="page-item"><a className="page-link" href="#">3</a></li>
                                    <li className="page-item">
                                        <a className="page-link" href="#">Tiếp</a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </Fragment>
    );
}

export default ShopDetail;