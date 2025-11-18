import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import Header from './Header';
import Footer from './Footer';

function Policies() {
    const [policies, setPolicies] = useState({
        warranty: '',
        return: '',
        shipping: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/settings')
            .then(response => {
                if (response.data && typeof response.data === 'object') {
                    const settings = {};
                    Object.keys(response.data).forEach(key => {
                        settings[key] = response.data[key].value || '';
                    });
                    setPolicies({
                        warranty: settings['policy.warranty'] || '',
                        return: settings['policy.return'] || '',
                        shipping: settings['policy.shipping'] || ''
                    });
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching policies:', error);
                setLoading(false);
            });
    }, []);

    const formatPolicy = (text) => {
        if (!text) return '';
        // Convert line breaks to <br> tags
        return text.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
                {line}
                {idx < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    return (
        <Fragment>
            <Header />
            
            <div className="container-fluid bg-secondary mb-5">
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                    <h1 className="font-weight-semi-bold text-uppercase mb-3">Chính sách</h1>
                    <div className="d-inline-flex">
                        <p className="m-0"><a href="/">Trang chủ</a></p>
                        <p className="m-0 px-2">-</p>
                        <p className="m-0">Chính sách</p>
                    </div>
                </div>
            </div>

            <div className="container-fluid pt-5 pb-5">
                <div className="row px-xl-5">
                    <div className="col-lg-12">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Chính sách bảo hành */}
                                {policies.warranty && (
                                    <div className="card mb-4 shadow-sm">
                                        <div className="card-header bg-primary text-white">
                                            <h4 className="mb-0">
                                                <i className="fas fa-shield-alt me-2"></i>
                                                Chính sách bảo hành
                                            </h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="policy-content" style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                                                {formatPolicy(policies.warranty)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chính sách đổi trả */}
                                {policies.return && (
                                    <div className="card mb-4 shadow-sm">
                                        <div className="card-header bg-success text-white">
                                            <h4 className="mb-0">
                                                <i className="fas fa-exchange-alt me-2"></i>
                                                Chính sách đổi trả
                                            </h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="policy-content" style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                                                {formatPolicy(policies.return)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chính sách vận chuyển */}
                                {policies.shipping && (
                                    <div className="card mb-4 shadow-sm">
                                        <div className="card-header bg-info text-white">
                                            <h4 className="mb-0">
                                                <i className="fas fa-truck me-2"></i>
                                                Chính sách vận chuyển
                                            </h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="policy-content" style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                                                {formatPolicy(policies.shipping)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!policies.warranty && !policies.return && !policies.shipping && (
                                    <div className="text-center py-5">
                                        <i className="fas fa-file-contract fa-3x text-muted mb-3"></i>
                                        <h4 className="text-muted">Chưa có thông tin chính sách</h4>
                                        <p className="text-muted">Vui lòng quay lại sau.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </Fragment>
    );
}

export default Policies;

