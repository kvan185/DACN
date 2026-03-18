import React, { useEffect, useState, useRef } from 'react';
import socketIOClient from "socket.io-client";
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const host = "http://localhost:3000";

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

    const fetchOrderList = async (accessToken) => {
        const response = await fetch('/api/order', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        const data = await response.json();
        if (data) setOrderList(data);
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

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [orderList]);

    return (
        <section className="block-order">
            <h3 className="title-admin">Danh sách đơn hàng</h3>

            <div className="order-container background-radius">
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