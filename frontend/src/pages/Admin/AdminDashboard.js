import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Box, Typography, AppBar, Tabs, Tab, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddProductForm from './AddProductForm';
import EditProductModal from './EditProductModal';
import ProductTable from './ProductTable';
import OrderTable from './OrderTable';

function AdminDashboard() {
    // Khởi tạo trạng thái
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', img: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const navigate = useNavigate();

    // Kiểm tra xác thực khi component được tải
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/admin/login');
        } else {
            fetchProducts();
            fetchOrders();
        }
    }, [navigate]);

    // Lấy danh sách sản phẩm từ server
    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    // Lấy danh sách đơn hàng từ server
    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    // Thêm sản phẩm mới
    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.price || !newProduct.description || !newProduct.img) {
            alert('Vui lòng điền đầy đủ thông tin sản phẩm.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post('/admin/products', newProduct, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewProduct({ name: '', price: '', description: '', img: '' }); // Clear form
            fetchProducts(); // Refresh product list
        } catch (error) {
            console.error('Error adding product:', error);
        }
    };

    // Xóa sản phẩm
    const handleDeleteProduct = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`/admin/products/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchProducts(); // Refresh product list
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    };

    // Sửa sản phẩm
    const handleEditProduct = async () => {
        if (!editingProduct.name || !editingProduct.price || !editingProduct.description || !editingProduct.img) {
            alert('Vui lòng điền đầy đủ thông tin sản phẩm.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/admin/products/${editingProduct.id}`, editingProduct, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
        } catch (error) {
            console.error('Error editing product:', error);
        }
    };

    // Xử lý thay đổi tab
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Xử lý thay đổi trang
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    // Xử lý thay đổi số lượng hàng trên mỗi trang
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Xử lý đăng xuất
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin/login');
    };

    return (
        <Container component="main" maxWidth="lg">
            <Box sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ mr: 2 }}>
                            Xin chào, Admin
                        </Typography>
                        <Button variant="contained" color="secondary" onClick={handleLogout}>
                            Đăng xuất
                        </Button>
                    </Box>
                </Box>
                <AppBar position="static" color="primary">
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        aria-label="menu tabs"
                        indicatorColor="secondary"
                        textColor="inherit"
                        variant="fullWidth"
                    >
                        <Tab label="Thêm sản phẩm" />
                        <Tab label="Sửa và Xóa sản phẩm" />
                        <Tab label="Thông tin thanh toán" />
                    </Tabs>
                </AppBar>

                {/* Tab Thêm sản phẩm */}
                {tabValue === 0 && (
                    <AddProductForm
                        newProduct={newProduct}
                        setNewProduct={setNewProduct}
                        handleAddProduct={handleAddProduct}
                    />
                )}

                {/* Tab Sửa và Xóa sản phẩm */}
                {tabValue === 1 && (
                    <ProductTable
                        products={products}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        handleDeleteProduct={handleDeleteProduct}
                        setEditingProduct={setEditingProduct}
                        setIsModalOpen={setIsModalOpen}
                    />
                )}

                {/* Tab Thông tin thanh toán */}
                {tabValue === 2 && (
                    <OrderTable
                        orders={orders}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        handleChangePage={handleChangePage}
                        handleChangeRowsPerPage={handleChangeRowsPerPage}
                    />
                )}

                {/* Modal Sửa sản phẩm */}
                <EditProductModal
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    editingProduct={editingProduct}
                    setEditingProduct={setEditingProduct}
                    handleEditProduct={handleEditProduct}
                />
            </Box>
        </Container>
    );
}

export default AdminDashboard;