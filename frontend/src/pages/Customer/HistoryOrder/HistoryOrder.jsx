import React, { useEffect, useState, useRef } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import moment from 'moment';
import socketIOClient from "socket.io-client";
const host = "http://localhost:3000";

import './history-order.scss';
import pizza from '../../../assets/img/pizza.jpg';
import { fetchUpdateStatusOrder } from '../../../actions/order';
import { statusOrder } from '../../../config/statusOrder';
import Cart from '../../../components/Customer/Cart/Cart';

function HistoryOrder(props) {
    const [orderList, setOrderList] = useState(null);
    const [orderSocket, setOrderSocket] = useState([]);
    const socketRef = useRef();
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const user = JSON.parse(sessionStorage.getItem("user"));

    useEffect(() => {
        socketRef.current = socketIOClient.connect(host);
        socketRef.current.emit('userConnect', user.id);
        socketRef.current.on('sendStatusOrder', dataOrder => {
            console.log(dataOrder);
            setOrderSocket(dataOrder);
        });
    }, []);

    const fetchOrderUser = async(accessToken)=>{
        const response = await fetch('api/order',{
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        const data = await response.json();

        if(data){
            setOrderList(data);
            return;
        } 
    }

    useEffect(()=>{
        if(accessToken) fetchOrderUser(accessToken);
    },[accessToken, orderSocket]);

    const handleCancelOrder = async (orderId) =>{
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.CANCELED);
            if (result.status === 200) {
                return;
            }
        }   
    }

    return (
        <>
            <Cart accessToken={accessToken}/>
            <div className='block__history-order'>
                <Container>
                    <h2>Lịch sử đơn hàng</h2>
                    <div className='history-order-list'>
                    {
                        orderList && (
                            orderList.map((items, index)=>{
                                const {id, total_item, total_price, type_order, updatedAt} = items.order;
                                let status = items.order.status;
    
                                if(orderSocket && orderSocket.cart_id === id){
                                    status = orderSocket.status;
                                }

                                return(
                                    <div className="history-order-item completed" key={index}>
                                        <div className="history-order-head">
                                            <label>Mã đơn hàng: <span>#{id}</span> </label>
                                            <label>Ngày đặt hàng: <span className='order-time'>{moment(updatedAt.createdAt).format('DD-MM-YYYY')}</span> </label>
                                        </div>
                                        <div className="history-order-processing">
                                            <div className="row">
                                                <div className={`col-3 ${status === statusOrder.NEW ? 'active' : 
                                                    (status === statusOrder.CONFIRMED || status === statusOrder.PROCESSING || status === statusOrder.COMPLETED) ? 
                                                    'step-success' : ''}`}>
                                                    <span>
                                                        <span className="number">1</span>
                                                    </span>
                                                    <span>Chờ nhận đơn</span>
                                                </div>
                                                <div className={`col-3 ${status === statusOrder.CONFIRMED ? 'active' : 
                                                    (status === statusOrder.PROCESSING || status === statusOrder.COMPLETED) ? 
                                                    'step-success' :''}`}>
                                                    <span>
                                                        <span className="number">2</span>
                                                    </span>
                                                    <span>Đã nhận đơn</span>
                                                </div>
                                                <div className={`col-3 ${status === statusOrder.PROCESSING ? 'active' : 
                                                    (status === statusOrder.COMPLETED) ? 'step-success'
                                                    :''}`}>
                                                    <span>
                                                        <span className="number">3</span>
                                                    </span>
                                                    <span>Đơn hàng chờ hoàn tất</span>
                                                </div>
                                                <div className={`col-3 ${status === statusOrder.COMPLETED ? 'active' : ''}`}>
                                                    <span>
                                                        <span className="number">4</span>
                                                    </span>
                                                    <span>Hoàn thành</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="history-order-product">
                                            <Row>
                                                {items && (
                                                    items.orderItems.map((orderItem, index)=>{
                                                        const {product_image, product_name, price, qty} = orderItem;

                                                        return(
                                                            <Col xs={6} key={index}>
                                                                <div className="product-item">
                                                                    <img src={product_image ? `http://localhost:8080/static/images/${product_image}` : pizza} alt="" />
                                                                    <div className="product-item-info">
                                                                        <label>Tên sản phẩm: <span>{product_name}</span></label>
                                                                        <label>Số lượng: <span>{qty}</span></label>
                                                                        <label>Giá tiền: <span>
                                                                            {price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                                                        </span></label>
                                                                    </div>
                                                                </div>
                                                            </Col>
                                                        )
                                                    })
                                                )}

                                            </Row>
                                        </div>
                                        <div className="history-order-footer">
                                            <label>Tổng thanh toán: <span>
                                                {total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                            </span></label>

                                            <div className="history-order-status">
                                                { status ===  statusOrder.NEW && (
                                                    <button onClick={()=>handleCancelOrder(id)} className='btn btn-cancel'>Hủy đơn</button>
                                                )}
                                                <span className={`order-status ${status === statusOrder.CANCELED ? 'canceled' : 
                                                    (status === statusOrder.CONFIRMED) ? 'confirmed' : 
                                                    (status === statusOrder.COMPLETED) ? 'completed' : 
                                                    (status === statusOrder.PROCESSING) ? 'processing' : 'new'}`}>

                                                    {status === statusOrder.CANCELED ? 'Đơn đã hủy' : (status === statusOrder.CONFIRMED) ? 'Đã nhận đơn' : 
                                                    (status === statusOrder.COMPLETED ? 'Hoàn thành' : 
                                                    (status === statusOrder.PROCESSING) ? 'Đơn hàng chờ hoàn tất' : 'Chờ nhận đơn')}

                                                    </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                            )
                        } 
                        </div>
                </Container>
            </div>
        </>
    );
}

export default HistoryOrder;