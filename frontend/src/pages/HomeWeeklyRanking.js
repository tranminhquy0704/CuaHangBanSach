import React, { useMemo, useState } from 'react';
import { formatVND } from '../utils/currency';

// Weekly Best-seller Ranking mock based on simple points derived from sold count
// Tabs for categories; we infer by name keywords for demo
const CATS = [
  { key: 'vanhoc', title: 'Văn học', kw: ['mưa', 'nhà giả', 'bến xe', 'văn học'] },
  { key: 'kinhte', title: 'Kinh Tế', kw: ['kinh tế', 'doanh', 'marketing'] },
  { key: 'tamly', title: 'Tâm lý - Kỹ năng sống', kw: ['tâm lý', 'kỹ năng', 'sống'] },
  { key: 'thieunhi', title: 'Thiếu nhi', kw: ['thiếu nhi', 'trẻ', 'kid'] },
  { key: 'ngoaiNgu', title: 'Sách học ngoại ngữ', kw: ['english', 'tiếng anh', 'toeic', 'ielts'] },
  { key: 'foreign', title: 'Foreign books', kw: ['english', 'foreign'] },
  { key: 'other', title: 'Thể loại khác', kw: [] },
];

function filterByKw(products, kw) {
  const k = kw.map(s => s.toLowerCase());
  const list = products.filter(p => k.length === 0 || k.some(x => String(p.name||'').toLowerCase().includes(x)));
  return list
    .map(p => ({...p, points: (p.sold || 0) + Math.floor((p.rating || 4.5) * 100)}))
    .sort((a,b) => b.points - a.points)
    .slice(0, 5);
}

const HomeWeeklyRanking = ({ products = [] }) => {
  const [tab, setTab] = useState(CATS[0].key);

  const items = useMemo(() => {
    return products
      .map(p => ({...p, points: (p.sold || 0) + Math.floor((p.rating || 4.5) * 100)}))
      .sort((a,b) => b.points - a.points)
      .slice(0, 5);
  }, [products]);

  const featured = items[0];

  return (
    <div className="container-fluid pt-5">
      <div className="text-center mb-4">
        <h2 className="section-title px-5">
          <span className="px-2">Bảng xếp hạng bán chạy tuần</span>
        </h2>
      </div>
      
      <div className="row px-xl-5">
        <div className="col-md-6 col-lg-5">
          {items.map((p, idx) => (
            <a key={p.id} href={`/shopdetail/${p.id}`} className="d-flex align-items-center py-2 text-decoration-none" style={{borderBottom:'1px solid #f3f3f3', color: 'inherit'}}>
              <div className="text-success me-2" style={{width:28}}>{String(idx+1).padStart(2,'0')}</div>
              <img src={p.img} alt={p.name} style={{width:40, height:56, objectFit:'cover'}} className="me-2"/>
              <div className="flex-grow-1">
                <div className="fw-semibold text-truncate" title={p.name}>{p.name}</div>
                <div className="text-muted small">{p.author || ''}</div>
                <div className="text-muted small">{(p.points||0).toLocaleString()} điểm</div>
              </div>
            </a>
          ))}
        </div>
        <div className="col-md-6 col-lg-7">
          {featured ? (
            <a href={`/shopdetail/${featured.id}`} className="row text-decoration-none" style={{color: 'inherit'}}>
              <div className="col-sm-6">
                <img src={featured.img} alt={featured.name} className="w-100" style={{objectFit:'cover', borderRadius:8}}/>
              </div>
              <div className="col-sm-6">
                <h5 className="fw-bold">{featured.name}</h5>
                <div className="text-muted mb-2">Tác giả: {featured.author || 'Đang cập nhật'}</div>
                <div className="mb-2">
                  <span className="text-danger fw-bold me-2">{formatVND(featured.price)}</span>
                  {/* sale/discount mock if exists */}
                  {featured.oldPrice && (
                    <>
                      <span className="text-muted text-decoration-line-through me-2">{formatVND(featured.oldPrice)}</span>
                      <span className="badge bg-warning text-dark">-{Math.round((1 - featured.price/featured.oldPrice)*100)}%</span>
                    </>
                  )}
                </div>
                <p className="text-muted" style={{maxHeight:140, overflow:'hidden'}}>
                  {featured.description || 'Mô tả đang cập nhật...'}
                </p>
              </div>
            </a>
          ) : (
            <div className="text-muted">Không có dữ liệu</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeWeeklyRanking;
