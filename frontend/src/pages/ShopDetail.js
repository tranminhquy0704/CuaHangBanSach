import React, { Fragment, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import Header from './Header';
import Footer from './Footer';
import ProductItem from './productItem';
import axios from 'axios';
import { parseVND, formatVND } from '../utils/currency';
import { toast } from 'react-toastify';

function ShopDetail() {
    const { id } = useParams(); 
    const { addToCart: contextAddToCart } = useContext(CartContext);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedRating, setSelectedRating] = useState(0);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [relatedProducts, setRelatedProducts] = useState([]);
    const navigate = useNavigate();

    // Gọi API để lấy thông tin sản phẩm
    useEffect(() => {
        setLoading(true);
        // Thêm timestamp để tránh cache
        axios.get(`/api/products/${id}?_t=${Date.now()}`)
            .then(response => {
                setProduct(response.data);
            })
            .catch(error => {
                console.error('Error fetching product:', error);
            })
            .finally(() => {
                setLoading(false);
            });
        
        // Lấy comments
        axios.get(`/api/products/${id}/comments`)
            .then(response => {
                setComments(response.data);
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
            });
        
        // Lấy sản phẩm liên quan
        axios.get(`/api/products/${id}/related`)
            .then(response => {
                setRelatedProducts(response.data);
            })
            .catch(error => {
                console.error('Error fetching related products:', error);
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
    
    // Hàm gửi comment
    const handleSubmitComment = () => {
        const userEmail = localStorage.getItem("userEmail");
        const userName = localStorage.getItem("userName");
        
        if (!userEmail) {
            toast.info('Bạn cần đăng nhập để bình luận');
            navigate('/login');
            return;
        }
        
        if (!newComment.trim()) {
            toast.warning('Vui lòng nhập nội dung bình luận');
            return;
        }
        
        axios.post(`/api/products/${id}/comments`, {
            comment: newComment,
            userEmail: userEmail,
            userName: userName || 'Khách hàng'
        })
        .then(response => {
            setComments([response.data, ...comments]);
            setNewComment('');
            toast.success('Đã thêm bình luận của bạn');
        })
        .catch(error => {
            console.error('Error submitting comment:', error);
            toast.error('Không thể gửi bình luận lúc này');
        });
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

            {loading ? (
                <div className="container py-5">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
                            <span className="sr-only">Đang tải...</span>
                        </div>
                        <p className="mt-3 text-muted">Đang tải thông tin sản phẩm...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="container py-5">
                <div className="row">
                    <div className="col-lg-5 mb-4">
                        <div className="bg-white rounded shadow-sm p-3">
                            <img src={product.img} className="img-fluid rounded" alt={product.name} />
                        </div>
                    </div>
                    <div className="col-lg-7">
                        <div className="bg-white rounded shadow-sm p-4">
                            <h2 className="mb-3 fw-bold">{product.name}</h2>
                            
                            {/* Author and Publisher */}
                            <div className="mb-3">
                                {product.author && (
                                    <p className="mb-1">
                                        <span className="text-muted">Tác giả: </span>
                                        <span className="fw-semibold">{product.author}</span>
                                    </p>
                                )}
                                {product.publisher && (
                                    <p className="mb-1">
                                        <span className="text-muted">Nhà xuất bản: </span>
                                        <span className="fw-semibold">{product.publisher}</span>
                                    </p>
                                )}
                            </div>

                            {/* Rating and Sales */}
                            <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                                <div className="d-flex align-items-center">
                                    <div className="text-warning me-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <i key={star} className={star <= Math.round(Number(product.rating || 0)) ? 'fas fa-star' : 'far fa-star'}></i>
                                        ))}
                                    </div>
                                    <span className="fw-semibold">{Number(product.rating || 0).toFixed(1)}</span>
                                    <span className="text-muted ms-1">({product.rating_count || 0} đánh giá)</span>
                                </div>
                                <div className="mx-4" style={{width: '1px', height: '20px', backgroundColor: '#dee2e6'}}></div>
                                <div>
                                    <span className="text-muted">Đã bán: </span>
                                    <strong>{product.sold || 0}</strong>
                                </div>
                            </div>

                            {/* Price Section */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center" style={{gap: '15px'}}>
                                    {(() => {
                                        const rawPrice = parseVND(product.price);
                                        // Nếu là flash sale, tính giá sau khi giảm
                                        const isFlashSale = product.is_flashsale === 1 || product.is_flashsale === true;
                                        const discountPercent = isFlashSale && product.discount ? Number(product.discount) : 0;
                                        const finalPrice = isFlashSale && discountPercent > 0 
                                            ? Math.max(0, Math.round(rawPrice * (1 - discountPercent / 100)))
                                            : rawPrice;
                                        
                                        return (
                                            <>
                                                <h3 className="text-danger fw-bold mb-0" style={{fontSize: '1.8rem'}}>{formatVND(finalPrice)}</h3>
                                                {(() => {
                                                    const hasData = !!product.oldPrice || !!product.discount;
                                                    const demo = !hasData && process.env.NODE_ENV !== 'production';
                                                    const old = product.oldPrice
                                                      ? parseVND(product.oldPrice)
                                                      : (product.discount ? Math.round(rawPrice / (1 - product.discount / 100)) : (demo ? Math.round(rawPrice / 0.8) : null));
                                                    
                                                    // Nếu là flash sale, old price là giá gốc
                                                    const oldPrice = isFlashSale && discountPercent > 0 ? rawPrice : old;
                                                    
                                                    if (!oldPrice || !isFinite(oldPrice) || oldPrice <= finalPrice) return null;
                                                    const percent = Math.max(0, Math.round((1 - finalPrice / oldPrice) * 100));
                                                    return (
                                                        <>
                                                            <del className="text-muted" style={{fontSize: '1.1rem'}}>{formatVND(oldPrice)}</del>
                                                            <span className="badge bg-danger text-white px-2 py-1" style={{fontSize: '0.9rem'}}>-{percent}%</span>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Quantity and Add to Cart */}
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div>
                                    <label className="form-label text-muted mb-2">Số lượng</label>
                                    <div className="input-group" style={{ width: '140px' }}>
                                        <button 
                                            className="btn btn-outline-secondary" 
                                            onClick={() => handleQuantityChange('decrease')}
                                        >
                                            <i className="fas fa-minus"></i>
                                        </button>
                                        <input 
                                            type="text" 
                                            className="form-control text-center fw-bold" 
                                            value={quantity} 
                                            readOnly 
                                        />
                                        <button 
                                            className="btn btn-outline-secondary" 
                                            onClick={() => handleQuantityChange('increase')}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <label className="form-label text-white mb-2">.</label>
                                    <button 
                                        className="btn btn-danger w-100 py-2 fw-semibold"
                                        onClick={handleAddToCart}
                                        style={{fontSize: '1.1rem'}}
                                    >
                                        <i className="fas fa-shopping-cart me-2"></i>
                                        Thêm vào giỏ hàng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row mt-5">
                    <div className="col-12">
                        <div className="bg-white rounded shadow-sm p-4">
                            <h4 className="mb-4 fw-bold border-bottom pb-3">
                                Mô tả sản phẩm
                            </h4>
                            <div className="text-muted" style={{lineHeight: '1.8'}}>
                                {product.description || 'Đang cập nhật mô tả sản phẩm.'}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Review Section */}
                <div className="row mt-5">
                    <div className="col-12">
                        <div className="bg-white rounded shadow-sm p-4">
                            <h4 className="mb-4 fw-bold border-bottom pb-3">
                                <i className="fas fa-star text-warning me-2"></i>
                                Đánh giá sản phẩm
                            </h4>
                            
                            {/* Rating Summary */}
                            <div className="row mb-4">
                                <div className="col-md-3 text-center">
                                    <div className="bg-light rounded p-4">
                                        <h1 className="text-warning mb-1 fw-bold" style={{fontSize: '3rem'}}>{Number(product.rating || 0).toFixed(1)}</h1>
                                        <div className="mb-2" style={{fontSize: '1.2rem'}}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <i key={star} className={star <= Math.round(Number(product.rating || 0)) ? 'fas fa-star text-warning' : 'far fa-star text-warning'}></i>
                                            ))}
                                        </div>
                                        <p className="text-muted mb-0"><strong>{product.rating_count || 0}</strong> đánh giá</p>
                                    </div>
                                </div>
                                <div className="col-md-9">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const ratingCount = Number(product.rating_count || 0);
                                        const starCount = Number(product[`star_${star}`] || 0);
                                        const percentage = ratingCount > 0 ? Math.round((starCount / ratingCount) * 100) : 0;
                                        return (
                                            <div key={star} className="d-flex align-items-center mb-2">
                                                <div className="text-nowrap me-3" style={{width: '60px'}}>
                                                    {star} <i className="fas fa-star text-warning"></i>
                                                </div>
                                                <div className="progress flex-grow-1" style={{height: '10px'}}>
                                                    <div 
                                                        className="progress-bar bg-warning" 
                                                        style={{
                                                            width: `${percentage}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="ms-3 text-muted fw-semibold" style={{width: '40px'}}>
                                                    {percentage}%
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                                if (res?.data) {
                                                  setProduct(prev => ({ 
                                                    ...prev, 
                                                    rating: res.data.rating,
                                                    rating_count: res.data.rating_count,
                                                    star_1: res.data.star_1,
                                                    star_2: res.data.star_2,
                                                    star_3: res.data.star_3,
                                                    star_4: res.data.star_4,
                                                    star_5: res.data.star_5
                                                  }));
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
                
                {/* Comments Section */}
                <div className="row mt-5">
                    <div className="col-12">
                        <div className="bg-white rounded shadow-sm p-4">
                            <h4 className="mb-4 fw-bold border-bottom pb-3">
                                <i className="fas fa-comments text-primary me-2"></i>
                                Bình luận ({comments.length})
                            </h4>
                            
                            {/* Comment Form */}
                            <div className="mb-4 p-3 bg-light rounded">
                                <textarea 
                                    className="form-control mb-3" 
                                    rows="3" 
                                    placeholder="Chia sẻ cảm nghĩ của bạn về cuốn sách này..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                ></textarea>
                                <div className="d-flex justify-content-end">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={handleSubmitComment}
                                    >
                                        <i className="fas fa-paper-plane me-2"></i>
                                        Gửi bình luận
                                    </button>
                                </div>
                            </div>
                            
                            {/* Comments List */}
                            <div className="comments-list">
                                {comments.length === 0 ? (
                                    <div className="text-center text-muted py-5">
                                        <i className="fas fa-comment-slash fa-3x mb-3"></i>
                                        <p>Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
                                    </div>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="mb-3 pb-3 border-bottom">
                                            <div className="d-flex align-items-start">
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                                                     style={{width: '40px', height: '40px', fontSize: '1.2rem'}}>
                                                    {comment.user_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span className="fw-bold">{comment.user_name}</span>
                                                        <span className="text-muted small">
                                                            {new Date(comment.created_at).toLocaleDateString('vi-VN', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <p className="mb-0">{comment.comment}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Related Products Section */}
                {relatedProducts.length > 0 && (
                    <div className="row mt-5">
                        <div className="col-12">
                            <div className="text-center mb-4">
                                <h2 className="section-title px-5">
                                    <span className="px-2">Sách Liên Quan</span>
                                </h2>
                            </div>
                            <div className="row px-xl-5 justify-content-center">
                                {relatedProducts.map((relatedProduct) => (
                                    <ProductItem
                                        key={relatedProduct.id}
                                        product={relatedProduct}
                                        addToCart={contextAddToCart}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
                </>
            )}

            <Footer />
        </Fragment>
    );
}

export default ShopDetail;