import React from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Button, Typography, TextField, IconButton, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const ProductTable = ({ products, searchTerm, setSearchTerm, handleDeleteProduct, setEditingProduct, setIsModalOpen }) => {
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
                Sửa và Xóa sản phẩm
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <TextField
                    label="Tìm kiếm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <IconButton>
                                <SearchIcon />
                            </IconButton>
                        ),
                    }}
                />
            </Box>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell>Giá</TableCell>
                        <TableCell>Mô tả</TableCell>
                        <TableCell>Hình ảnh</TableCell>
                        <TableCell>Hành động</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredProducts.map(product => (
                        <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.price}</TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {product.description}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <img src={product.img} alt={product.name} style={{ width: '50px', height: '50px' }} />
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => {
                                        setEditingProduct(product);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    Sửa
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={() => handleDeleteProduct(product.id)}
                                >
                                    Xóa
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
};

export default ProductTable;