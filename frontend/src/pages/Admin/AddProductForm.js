import React from 'react';
import { Button, TextField, Grid, Typography, Box } from '@mui/material';

const AddProductForm = ({ newProduct, setNewProduct, handleAddProduct }) => {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
                Thêm sản phẩm
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label="Tên sản phẩm"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label="Giá"
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label="Mô tả"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label="URL hình ảnh"
                        value={newProduct.img}
                        onChange={(e) => setNewProduct({ ...newProduct, img: e.target.value })}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button variant="contained" color="primary" onClick={handleAddProduct}>
                        Thêm sản phẩm
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AddProductForm;