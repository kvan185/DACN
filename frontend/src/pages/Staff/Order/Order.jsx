import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../../../socket.js';
import { Link } from 'react-router-dom';
const host = import.meta.env.VITE_API_URL;

import './order.scss';
import '../../../scss/admin/admin-theme.scss';

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
            if (searchQuery) setCurrentPage(1);
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
        <div className="admin-card mt-md">
            <div className="admin-card__header">
                <h3>Danh sách đơn hàng</h3>
                <div className="admin-card__actions">
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
                                    className="admin-form__control border-start-0 border-end-0 shadow-none"
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
                
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã đơn hàng</th>
                                <th>Tên khách hàng</th>
                                <th>Nguồn đặt hàng</th>
                                <th>Số lượng sản phẩm</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th style={{textAlign: 'center'}}>Hành động</th>
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
                                        <td>
                                            <div className="admin-table__actions" style={{justifyContent: 'center'}}>
                                                <Link to={`/staff/order/detail/${id}`} className="admin-btn admin-btn--info admin-btn--sm">
                                                    Chi tiết
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
                </div>

                <div className="admin-pagination">
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
        </div>
    );
}

export default Order;