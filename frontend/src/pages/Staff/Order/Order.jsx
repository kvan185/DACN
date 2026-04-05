import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../../../socket.js';
import { Link } from 'react-router-dom';
import { Table, InputGroup, Form } from 'react-bootstrap';
import { FaSearch, FaEye } from 'react-icons/fa';
import { IoMdClose } from "react-icons/io";
const host = import.meta.env.VITE_API_URL;

import './order.scss';
import '../../../scss/admin/admin-theme.scss';

import { statusOrder } from "../../../config/statusOrder.js";

function Order(props) {
    const [orderList, setOrderList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 6;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = orderList.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(orderList.length / itemsPerPage);
    const [orderSocket, setOrderSocket] = useState([]);
    const socketRef = useRef(socket);
    const accessToken = sessionStorage.getItem("accessToken");
    const user = JSON.parse(sessionStorage.getItem("user"));

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef(null);

    const fetchOrderList = async (accessToken, searchQuery = '') => {
        setIsSearching(true);
        try {
            const url = searchQuery ? `/api/order?search=${encodeURIComponent(searchQuery)}` : '/api/order';
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                }
            });
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                setOrderList(data);
            } else {
                console.error('Lỗi khi lấy đơn hàng:', data);
                setOrderList([]);
            }
            setCurrentPage(1);
        } catch (error) {
            console.error('Fetch orders error:', error);
        } finally {
            setIsSearching(false);
        }
    }

    useEffect(() => {
        if (accessToken) fetchOrderList(accessToken);
        if (user && user.id) {
            socketRef.current.emit('adminConnect', user.id);
        }

        const handleSendListOrder = listOrder => {
            console.log(listOrder);
            setOrderSocket(listOrder);
        };

        socketRef.current.on('sendListOrder', handleSendListOrder);

        return () => {
            socketRef.current.off('sendListOrder', handleSendListOrder);
        };
    }, []);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            if (accessToken) fetchOrderList(accessToken, value);
        }, 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (accessToken) fetchOrderList(accessToken, '');
    };

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [orderList]);

    return (
        <div className="staff-management block-order ps-0 pt-0">
            <div className="staff-management__header d-flex justify-content-between align-items-center mb-4 mt-4 px-0">
                <h2 className="title-admin mb-0" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748', marginLeft: '0', paddingLeft: '0' }}>Quản lý Đơn hàng
                    <style>{`.title-admin::after { display: none !important; }`}</style> </h2>
                <div className="d-flex align-items-center gap-2">
                    <div className="search-container" style={{ width: '380px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0 border-secondary-subtle">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm kiếm theo mã đơn hàng hoặc tên khách..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="border-start-0 border-secondary-subtle ps-1 shadow-none"
                            />
                            {searchTerm && (
                                <InputGroup.Text
                                    className="bg-white border-start-0 cursor-pointer border-secondary-subtle"
                                    onClick={handleClearSearch}
                                >
                                    <IoMdClose className="text-secondary" />
                                </InputGroup.Text>
                            )}
                        </InputGroup>
                    </div>
                </div>
            </div>

            <div className="pt-0 mt-0">
                <Table striped bordered hover className="mt-3 text-center align-middle">
                    <thead className="table-success">
                        <tr>
                            <th>STT</th>
                            <th>Mã đơn hàng</th>
                            <th>Tên khách hàng</th>
                            <th>Nguồn đặt hàng</th>
                            <th>Số lượng</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Xem chi tiết</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList && orderList.length > 0 ? (
                            currentOrders.map((orderData, index) => {
                                const {
                                    id,
                                    first_name,
                                    last_name,
                                    total_item,
                                    total_price,
                                    order_source,
                                    table_number,
                                    status
                                } = orderData;

                                return (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{id}</td>
                                        <td>{first_name + ' ' + last_name}</td>
                                        <td>
                                            <span className={order_source === 'online' ? 'admin-badge admin-badge--info' : 'admin-badge admin-badge--warning'}>
                                                {order_source === 'online' ? 'Đặt hàng online' : `Đặt tại bàn ${table_number}`}
                                            </span>
                                        </td>
                                        <td>{total_item}</td>
                                        <td>
                                            <span>
                                                {total_price ? total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' }) : 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${status === statusOrder.NEW ? 'admin-badge--default' :
                                                status === statusOrder.CONFIRMED ? 'admin-badge--info' :
                                                    status === statusOrder.PROCESSING ? 'admin-badge--warning' :
                                                        status === statusOrder.COMPLETED ? 'admin-badge--success' : 'admin-badge--danger'
                                                }`}>
                                                {
                                                    status === statusOrder.NEW ? 'Đơn mới' :
                                                        status === statusOrder.CONFIRMED ? 'Nhận đơn' :
                                                            status === statusOrder.PROCESSING ? 'Đang chờ làm' :
                                                                status === statusOrder.COMPLETED ? 'Hoàn thành' : 'Đã hủy'
                                                }</span>
                                        </td>
                                        <td className="text-center">
                                            <Link to={`/staff/order/detail/${id}`} className="btn btn-sm btn-link p-1" title="Chi tiết đơn hàng">
                                                <FaEye className='icon-view fs-5 text-info' />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center">Không có đơn hàng nào</td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                <div className="admin-pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Prev
                    </button>

                    {(() => {
                        const maxVisiblePages = 5;
                        const currentGroup = Math.ceil(currentPage / maxVisiblePages);
                        const startPage = (currentGroup - 1) * maxVisiblePages + 1;
                        const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
                        const pageNumbers = [];
                        for (let i = startPage; i <= endPage; i++) {
                            pageNumbers.push(
                                <button key={i} className={currentPage === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>{i}</button>
                            );
                        }
                        return pageNumbers;
                    })()}

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Order;