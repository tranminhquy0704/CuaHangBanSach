import React from 'react';
import { Link } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <nav className="bg-dark text-white p-3" style={{ width: 240 }}>
        <h5 className="mb-4">Dashboard</h5>
        <ul className="nav flex-column small">
          <li className="nav-item mb-2"><Link className="nav-link text-white p-0" to="/admin">Overview</Link></li>
          <li className="nav-item mb-2"><Link className="nav-link text-white p-0" to="/admin">Books</Link></li>
          <li className="nav-item mb-2"><Link className="nav-link text-white p-0" to="/admin">Customers</Link></li>
          <li className="nav-item mb-2"><Link className="nav-link text-white p-0" to="/admin">Orders</Link></li>
          <li className="nav-item mb-2"><Link className="nav-link text-white p-0" to="/admin">Inventory</Link></li>
          <li className="nav-item mb-2"><Link className="nav-link text-white p-0" to="/admin">Settings</Link></li>
        </ul>
      </nav>
      <main className="flex-grow-1 bg-light">
        <div className="border-bottom bg-white px-3 py-2 d-flex align-items-center justify-content-between">
          <div className="fw-semibold">Admin</div>
          <a className="btn btn-sm btn-outline-secondary" href="/">Back to site</a>
        </div>
        <div className="p-3">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
