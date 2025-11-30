import React, { useMemo, useState } from 'react';
import { formatVND, parseVND } from '../utils/currency';

// Featured shelf without tabs: show top 5 products by sold
const HomeTabbedShelf = ({ products = [], onAddToCart }) => {
  const activeItems = useMemo(() => {
    const list = Array.isArray(products) ? [...products] : [];
    return list
      .sort((a, b) => (b?.sold || 0) - (a?.sold || 0))
      .slice(0, 5);
  }, [products]);

  // Calculate old price from discount if needed (same logic as ShopDetail.js)
  const getOldPrice = (product) => {
    const priceNumber = parseVND(product.price);
    const hasData = !!product.oldPrice || !!product.discount;
    const demo = !hasData && process.env.NODE_ENV !== 'production';
    
    const old = product.oldPrice
      ? parseVND(product.oldPrice)
      : (product.discount ? Math.round(priceNumber / (1 - product.discount / 100)) : (demo ? Math.round(priceNumber / 0.8) : null));
    
    if (!old || !isFinite(old) || old <= priceNumber) return null;
    return old;
  };

  return (
    <div className="container-fluid pt-5">
      <div className="text-center mb-4">
        <h2 className="section-title px-5">
          <span className="px-2">Bộ Sưu Tập Nổi Bật</span>
        </h2>
      </div>
      {/* Tabs removed as requested */}

      <div className="row px-xl-5 justify-content-center">
        {activeItems.map((p) => (
          <div className="col-lg-2 col-md-3 col-sm-6 pb-1" key={p.id}>
            <div className="card product-item border-0 mb-4">
              <a href={`/shopdetail/${p.id}`} className="card-header product-img position-relative overflow-hidden bg-transparent border p-0 d-block" style={{height: 180}}>
                <img className="img-fluid w-100 h-100" src={p.img} alt={p.name} style={{objectFit:'cover'}} />
              </a>
              <div className="card-body border-left border-right text-center p-0 pt-3 pb-3">
                <h6 className="product-title mb-2 text-truncate" title={p.name}>
                  <a href={`/shopdetail/${p.id}`} className="text-dark">{p.name}</a>
                </h6>
                <div className="d-flex justify-content-center align-items-center" style={{gap: '8px'}}>
                  <h6 className="text-danger mb-0">{formatVND(p.price)}</h6>
                  {(() => {
                    const oldPrice = getOldPrice(p);
                    if (oldPrice) {
                      return (
                        <small>
                          <del className="text-muted">{formatVND(oldPrice)}</del>
                        </small>
                      );
                    }
                    return null;
                  })()}
                </div>
                <small className="text-muted">Đã bán {p.sold || 0}</small>
              </div>
              <div className="card-footer d-flex justify-content-between bg-light border">
                <a href="/" className="btn btn-sm text-dark p-0" onClick={(e)=>{e.preventDefault(); onAddToCart && onAddToCart({...p, quantity:1});}}>
                  <i className="fas fa-shopping-cart text-primary mr-1"></i> Thêm vào giỏ hàng
                </a>
                <a href={`/shopdetail/${p.id}`} className="btn btn-sm text-dark p-0">
                  <i className="fas fa-eye text-primary mr-1"></i> Chi tiết
                </a>
              </div>
            </div>
          </div>
        ))}
        <div className="col-12 d-flex justify-content-center mt-2">
          <a href="/shop" className="btn btn-outline-primary px-4">Xem Thêm</a>
        </div>
      </div>
    </div>
  );
};

export default HomeTabbedShelf;
