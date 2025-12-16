import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { parseVND, formatVND } from '../utils/currency';

// Check if Flash Sale is enabled
function useFlashSaleEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    axios.get('/api/settings')
      .then(res => {
        if (res.data && res.data['promo.enable_flashsale']) {
          setEnabled(res.data['promo.enable_flashsale'].value === 'true');
        }
      })
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

// Persisted countdown: keep a stable end timestamp in localStorage to avoid resetting on reload
function getPersistentEnd(durationMs, storageKey = 'flash_sale_end') {
  try {
    const raw = localStorage.getItem(storageKey);
    const saved = raw ? parseInt(raw, 10) : NaN;
    const now = Date.now();
    // if saved end exists and is in the future, reuse it
    if (Number.isFinite(saved) && saved > now) return saved;
    // else create new end and persist
    const end = now + durationMs;
    localStorage.setItem(storageKey, String(end));
    return end;
  } catch (_) {
    return Date.now() + durationMs;
  }
}

function useCountdownTo(endTs) {
  const [left, setLeft] = useState(() => Math.max(0, endTs - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, endTs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [endTs]);
  const parts = useMemo(() => {
    const total = Math.max(0, left);
    const sec = Math.floor(total / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return { h: pad(h), m: pad(m), s: pad(s) };
  }, [left]);
  return parts;
}

const FlashSale = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const flashSaleEnabled = useFlashSaleEnabled();
  // Persist a 2-hour countdown window so reloads don't reset the timer
  const end = getPersistentEnd(2 * 60 * 60 * 1000, 'flash_sale_end');
  const { h, m, s } = useCountdownTo(end);

  useEffect(() => {
    axios.get(`/api/products?_t=${Date.now()}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        // Chỉ lấy sản phẩm có is_flashsale = true (hoặc 1)
        const list = data.filter(p => p.is_flashsale === 1 || p.is_flashsale === true);
        setItems(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Don't render if Flash Sale is disabled
  if (!flashSaleEnabled) {
    return null;
  }

  return (
    <section className="flash-sale container-fluid mt-4">
      <div className="flash-sale__header d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <h3 className="flash-sale__title mb-0 mr-3">FLASH <span>SALE</span></h3>
          <div className="flash-sale__countdown">
            <span>{h}</span><span>:</span><span>{m}</span><span>:</span><span>{s}</span>
          </div>
        </div>
        <a href="/shop" className="flash-sale__viewall">Xem tất cả</a>
      </div>

      <div
        className="flash-sale__scroller d-flex"
        style={{ gap: '12px', overflowX: 'auto', padding: '6px 4px 4px' }}
      >
        {loading && (
          [...Array(6)].map((_, i) => (
            <div key={`sk-fs-${i}`} className="flash-card skeleton-card" style={{ flex: '0 0 180px' }}>
              <div className="skeleton-thumb" style={{ height: 180 }} />
              <div className="skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton-line" style={{ width: '40%' }} />
            </div>
          ))
        )}
        {!loading && items.map((p) => {
          const rawPrice = parseVND(p.price);
          const price = Math.max(0, Math.round(rawPrice * (1 - (Number(p.discount) || 0)/100)));
          const priceStr = formatVND(price);
          const oldPriceStr = formatVND(rawPrice);
          const total = Number(p.promoTotal || p.promoStock || p.stock || p.inventory || 0);
          const sold = Number(p.sold || 0);
          const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((sold / total) * 100))) : 0;
          return (
            <div key={p.id} className="flash-card" style={{ flex: '0 0 180px' }}>
              <a href={`/shopdetail/${p.id}`} className="d-block flash-card__thumb" style={{ height: 180 }}>
                <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </a>
              <div className="flash-card__body">
                <div className="flash-card__name" title={p.name}>{p.name}</div>
                <div className="flash-card__price">
                  <strong>{priceStr}</strong>
                  <span className="flash-card__old">{oldPriceStr}</span>
                  <span className="flash-card__discount">-{p.discount}%</span>
                </div>
                <div className="flash-card__sold">
                  <div className="track">
                    <div className="fill" style={{ width: pct + '%' }} />
                  </div>
                  <small>Đã bán {sold}{total ? `/${total}` : ''}</small>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FlashSale;
