import React, { useEffect, useState, useRef } from 'react';
import socketIOClient from "socket.io-client";
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const host = import.meta.env.VITE_API_URL;

import './order.scss';
import { statusOrder } from "../../../config/statusOrder.js";

function Order(props) {
    const [orderList, setOrderList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = orderList.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(orderList.length / itemsPerPage);
    const [orderSocket, setOrderSocket] = useState([]);
    const socketRef = useRef();
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
            if (searchQuery) setCurrentPage(1);
        } catch (error) {
            console.error('Fetch orders error:', error);
        } finally {
            setIsSearching(false);
        }
    }

    useEffect(() => {
        if (accessToken) fetchOrderList(accessToken);
        socketRef.current = socketIOClient.connect(host);
        socketRef.current.emit('adminConnect', user.id);
        socketRef.current.on('sendListOrder', listOrder => {
            console.log(listOrder);
            setOrderSocket(listOrder);
        });
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
        <section className="block-order">
            <h3 className="title-admin">Danh sách đơn hàng</h3>

            <div className="order-container background-radius">
                <div className="d-flex justify-content-end mb-4 mt-3">
                    <div className="search-container" style={{ width: '380px' }}>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <i className="fa fa-search text-muted"></i>
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm theo Mã đơn, Khách hàng, SĐT..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="form-control border-start-0 border-end-0 shadow-none"
                            />
                            {searchTerm && (
                                <span 
                                    className="input-group-text bg-white border-start-0" 
                                    onClick={handleClearSearch}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="fa fa-times text-secondary"></i>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Table className='order-table'>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Mã đơn hàng</th>
                            <th>Tên khách hàng</th>
                            <th>Nguồn đặt hàng</th>
                            <th>Số lượng sản phẩm</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList && orderList.length > 0 && (
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
                                            <span className={order_source === 'online' ? 'source-online' : 'source-table'}>
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
                                            <span className={`status ${status === statusOrder.NEW ? 'status-new' :
                                                status === statusOrder.CONFIRMED ? 'status-confirmed' :
                                                    status === statusOrder.PROCESSING ? 'status-processing' :
                                                        status === statusOrder.COMPLETED ? 'status-completed' : 'status-canceled'
                                                }`}>
                                                {
                                                    status === statusOrder.NEW ? 'Đơn mới' :
                                                        status === statusOrder.CONFIRMED ? 'Nhận đơn' :
                                                            status === statusOrder.PROCESSING ? 'Đang chờ làm' :
                                                                status === statusOrder.COMPLETED ? 'Hoàn thành' : 'Đã hủy'
                                                }</span>
                                        </td>
                                        <td>
                                            <Link to={`/staff/order/detail/${id}`}>
                                                Chi tiết
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </Table>
                <div className="pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Prev
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            className={currentPage === i + 1 ? 'active' : ''}
                            onClick={() => setCurrentPage(i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </section>
    );
}

export default Order;