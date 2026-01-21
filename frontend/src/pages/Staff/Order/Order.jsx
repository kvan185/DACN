import React, { useEffect, useState, useRef } from 'react';
import socketIOClient from "socket.io-client";
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const host = "http://localhost:3000";

import './order.scss';
import { statusOrder } from "../../../config/statusOrder.js";

function Order(props) {
    const [orderList, setOrderList] = useState([]);
    const [orderSocket, setOrderSocket] = useState([]);
    const socketRef = useRef();
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const user = JSON.parse(sessionStorage.getItem("user"));

    const fetchOrderList = async (accessToken) => {
        const response = await fetch('/api/order', {
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        const data = await response.json();
        if(data) setOrderList(data);
    }

    useEffect(()=>{
        if (accessToken) fetchOrderList(accessToken);
        socketRef.current = socketIOClient.connect(host);
        socketRef.current.emit('adminConnect', user.id);
        socketRef.current.on('sendListOrder', listOrder => {
            console.log(listOrder);
            setOrderSocket(listOrder);
        });
    }, []);

    useEffect(()=>{
        if(accessToken) fetchOrderList(accessToken);
    },[accessToken, orderSocket]);

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
                            orderList.map((orderData, index) => {
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

                                return(
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
            </div>
        </section>
    );
}

export default Order;