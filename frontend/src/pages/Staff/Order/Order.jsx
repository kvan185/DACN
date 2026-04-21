import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../../../socket.js';
import { Link } from 'react-router-dom';
import { Table, InputGroup, Form } from 'react-bootstrap';
import { FaSearch, FaEye, FaShareAlt, FaSortAmountDownAlt, FaSortAmountUp } from 'react-icons/fa';
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
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
    const [sortOrder, setSortOrder] = useState('desc');
    const debounceTimeoutRef = useRef(null);

    const fetchOrderList = async (token = accessToken, searchQuery = searchTerm, min = minPrice, max = maxPrice, payment = selectedPaymentStatus, order = sortOrder) => {
        setIsSearching(true);
        try {
            const queryParams = new URLSearchParams();
            if (searchQuery) queryParams.append('search', searchQuery);
            if (min) queryParams.append('minPrice', min);
            if (max) queryParams.append('maxPrice', max);
            if (payment !== 'All') queryParams.append('isPayment', payment === 'paid');
            if (order) {
                queryParams.append('sortBy', 'total_price');
                queryParams.append('order', order);
            }

            const url = `/api/order?${queryParams.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                setOrderList(data);
            } else {
                setOrderList([]);
            }
            setCurrentPage(1);
        } catch (error) {
            console.error('Fetch orders error:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const searchRef = useRef(searchTerm);
    useEffect(() => {
        searchRef.current = searchTerm;
    }, [searchTerm]);

    useEffect(() => {
        if (accessToken) fetchOrderList(accessToken, searchTerm, minPrice, maxPrice, selectedPaymentStatus, sortOrder);
        if (user && (user.id || user._id)) {
            socketRef.current.emit('adminConnect', user.id || user._id);
        }

        const handleRefreshList = () => {
            if (accessToken) fetchOrderList(accessToken, searchRef.current, minPrice, maxPrice, selectedPaymentStatus, sortOrder);
        };

        socketRef.current.on('sendListOrder', handleRefreshList);
        socketRef.current.on('paymentSuccess', handleRefreshList);
        socketRef.current.on('notification', handleRefreshList);
        socketRef.current.on('itemStatusUpdated', handleRefreshList);

        return () => {
            socketRef.current.off('sendListOrder', handleRefreshList);
            socketRef.current.off('paymentSuccess', handleRefreshList);
            socketRef.current.off('notification', handleRefreshList);
            socketRef.current.off('itemStatusUpdated', handleRefreshList);
        };
    }, [accessToken, selectedPaymentStatus]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            if (accessToken) fetchOrderList(accessToken, value, minPrice, maxPrice, selectedPaymentStatus, sortOrder);
        }, 500);
    };

    const handlePriceChange = () => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            if (accessToken) fetchOrderList(accessToken, searchTerm, minPrice, maxPrice, selectedPaymentStatus, sortOrder);
        }, 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (accessToken) fetchOrderList(accessToken, '', minPrice, maxPrice, selectedPaymentStatus, sortOrder);
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
                    <Form.Select
                        value={selectedPaymentStatus}
                        onChange={(e) => {
                            setSelectedPaymentStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{ width: '150px' }}
                        className="bg-white border-secondary-subtle shadow-none"
                    >
                        <option value="All">Thanh toán</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="unpaid">Chưa thanh toán</option>
                    </Form.Select>

                    <div className="d-flex align-items-center gap-1 bg-white border border-secondary-subtle rounded-2 px-2" style={{ height: '40px' }}>
                        <Form.Control
                            type="number"
                            placeholder="Tổng từ..."
                            value={minPrice}
                            onChange={(e) => {
                                setMinPrice(e.target.value);
                                handlePriceChange();
                            }}
                            className="border-0 shadow-none p-0 text-center"
                            style={{ width: '90px', fontSize: '14px' }}
                        />
                        <span className="text-muted">-</span>
                        <Form.Control
                            type="number"
                            placeholder="đến..."
                            value={maxPrice}
                            onChange={(e) => {
                                setMaxPrice(e.target.value);
                                handlePriceChange();
                            }}
                            className="border-0 shadow-none p-0 text-center"
                            style={{ width: '90px', fontSize: '14px' }}
                        />
                    </div>

                    <div className="search-container" style={{ width: '280px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0 border-secondary-subtle">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Mã đơn, tên khách, Sl..."
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
                    <button
                        className="btn btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={() => {
                            const nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                            setSortOrder(nextOrder);
                            fetchOrderList(accessToken, searchTerm, minPrice, maxPrice, selectedPaymentStatus, nextOrder);
                        }}
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #dee2e6' }}
                        title={sortOrder === 'desc' ? "Sắp xếp: Tổng tiền Lớn -> Bé" : "Sắp xếp: Tổng tiền Bé -> Lớn"}
                    >
                        {sortOrder === 'asc' ? <FaSortAmountUp className="text-success" /> : <FaSortAmountDownAlt className="text-success" />}
                        Tổng tiền ({sortOrder === 'desc' ? "Lớn → Bé" : "Bé → Lớn"})
                    </button>
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
                                    status,
                                    is_payment,
                                    guest_name
                                } = orderData;

                                return (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{id}</td>
                                        <td>{guest_name ? guest_name : (first_name + ' ' + last_name)}</td>
                                        <td>
                                            <span className={order_source === 'online' ? 'admin-badge admin-badge--info' : 'admin-badge admin-badge--warning'}>
                                                {order_source === 'online' ? 'Đặt hàng online' : `Bàn ${table_number}`}
                                            </span>
                                        </td>
                                        <td>{total_item}</td>
                                        <td>
                                            <span>
                                                {total_price ? total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' }) : 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex flex-column gap-1 align-items-center">
                                                {(() => {
                                                    let label = "Đã phục vụ";
                                                    let badgeClass = "admin-badge--info";

                                                    if (is_payment) {
                                                        label = "Hoàn thành";
                                                        badgeClass = "admin-badge--success";
                                                    } else if (status === statusOrder.CANCELED) {
                                                        label = "Đã hủy";
                                                        badgeClass = "admin-badge--danger";
                                                    } else if (status === statusOrder.NEW) {
                                                        label = "Đơn mới";
                                                        badgeClass = "admin-badge--default";
                                                    } else if (orderData.needs_support || orderData.hasPendingItems) {
                                                        label = "Chờ xử lý";
                                                        badgeClass = "admin-badge--warning";
                                                    }

                                                    return (
                                                        <span className={`admin-badge ${badgeClass}`}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                                <span className={`badge ${is_payment ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                                                    {is_payment ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <Link to={`/staff/order/detail/${id}`} className="btn btn-sm btn-link p-1" title="Chi tiết đơn hàng">
                                                    <FaEye className='icon-view fs-5 text-info' />
                                                </Link>
                                                <button
                                                    className="btn btn-sm btn-link p-1"
                                                    title="Chia sẻ vào Chat"
                                                    onClick={() => {
                                                        const event = new CustomEvent('shareOrderToChat', { detail: orderData });
                                                        window.dispatchEvent(event);
                                                    }}
                                                >
                                                    <FaShareAlt className='icon-share fs-5 text-warning' />
                                                </button>
                                            </div>
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