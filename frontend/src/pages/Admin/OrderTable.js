import React from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, TablePagination, Box, Typography } from '@mui/material';

const OrderTable = ({ orders, page, rowsPerPage, handleChangePage, handleChangeRowsPerPage }) => {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
                Thông tin thanh toán
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Đơn hàng #</TableCell>
                        <TableCell>Họ tên</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Số điện thoại</TableCell>
                        <TableCell>Địa chỉ</TableCell>
                        <TableCell>Tỉnh/Thành</TableCell>
                        <TableCell>Phương thức thanh toán</TableCell>
                        <TableCell>Tổng cộng</TableCell>
                        <TableCell>Ngày tạo</TableCell>
                        <TableCell>Sản phẩm đã mua</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(order => (
                        <TableRow key={order.id}>
                            <TableCell>{order.id}</TableCell>
                            <TableCell>{order.fullName}</TableCell>
                            <TableCell>{order.email}</TableCell>
                            <TableCell>{order.mobile}</TableCell>
                            <TableCell>{order.address}</TableCell>
                            <TableCell>{order.state}</TableCell>
                            <TableCell>{order.paymentMethod}</TableCell>
                            <TableCell>{order.total}đ</TableCell>
                            <TableCell>{(() => {
                                const d = order.createdAt || order.created_at || order.created || order.createdDate || order.date;
                                const dt = d ? new Date(d) : null;
                                return dt && !isNaN(dt) ? dt.toLocaleString() : '-';
                            })()}</TableCell>
                            <TableCell>
                                {order.cartItems && Array.isArray(order.cartItems) && order.cartItems.map((item, index) => (
                                    <div key={index}>
                                        {item.name} - Số lượng: {item.quantity} - Giá: {item.price}đ
                                    </div>
                                ))}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={orders.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Box>
    );
};

export default OrderTable;