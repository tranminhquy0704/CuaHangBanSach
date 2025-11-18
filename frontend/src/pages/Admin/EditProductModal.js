import React from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';

const EditProductModal = ({ isModalOpen, setIsModalOpen, editingProduct, setEditingProduct, handleEditProduct }) => {
    return (
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <Box sx={{ width: 400, p: 4, bgcolor: 'white', borderRadius: 2, boxShadow: 24 }}>
                <Typography variant="h6">Sửa sản phẩm</Typography>
                <TextField
                    label="Tên sản phẩm"
                    value={editingProduct?.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    fullWidth
                    sx={{ mb: 2 }}
                />
                <TextField
                    label="Giá"
                    type="number"
                    value={editingProduct?.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    fullWidth
                    sx={{ mb: 2 }}
                />
                <TextField
                    label="Mô tả"
                    value={editingProduct?.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    fullWidth
                    sx={{ mb: 2 }}
                />
                <TextField
                    label="URL hình ảnh"
                    value={editingProduct?.img || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, img: e.target.value })}
                    fullWidth
                    sx={{ mb: 2 }}
                />
                <Button variant="contained" color="primary" onClick={handleEditProduct}>
                    Lưu thay đổi
                </Button>
            </Box>
        </Modal>
    );
};

export default EditProductModal;