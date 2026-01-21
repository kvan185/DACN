import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {Row, Col} from 'react-bootstrap';
import moment from 'moment';

import { fetchUpdateIsPayment, fetchUpdateStatusOrder } from '../../../actions/order';
import { statusOrder } from '../../../config/statusOrder';

function OrderDetail(props) {
    const [orderDetail, setOrderDetail] = useState(null);
    const [orderStatus, setOrderStatus] = useState(null);
    const [orderPayment, setOrderPayment] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const { orderId } = useParams();
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));

    if(orderId && accessToken){
        useEffect(()=>{
            fetchOrderDetail(orderId, accessToken);
        },[orderId, accessToken,  orderStatus, orderPayment]);
    }

    const fetchOrderDetail = async (orderId, accessToken)=>{
        const response = await fetch(`/api/order/${orderId}`,{
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        const data = await response.json();
        console.log(data)

        if(data){
            setOrderDetail(data.order);
            setOrderItems(data.orderItems);
            return;
        }
    }

    const handleConfirmOrder = async (orderId) => {
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.CONFIRMED);
            if (result.status === 200) {
                setOrderStatus("CONFIRMED");
                return;
            }
        }        
    }

    const handleProcessingOrder = async (orderId) => {
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.PROCESSING);
            if (result.status === 200) {
                setOrderStatus("PROCESSING");
                return;
            }
        }
    }

    const handleCompleteOrder = async (orderId) => {
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.COMPLETED);
            if (result.status === 200) {
                setOrderStatus("COMPLETED");
                return;
            }
        }
    }

    const handlePayment = async (orderId) => {
        if (orderId) {
            var result = await fetchUpdateIsPayment(orderId, true);
            if (result.status === 200) {
                setOrderPayment(true);
            }
        }
    }

    return (
        <div className='order__detail'>
            <h3 className="title-admin">Đơn hàng: #{orderDetail && orderDetail.id}</h3>

            <div className="order__detail-container background-radius">
                <div className="order__detail-head">
                    <label>Tên tài khoản: <span>{orderDetail && orderDetail.first_name} {orderDetail && orderDetail.last_name}</span></label>
                    <label>Ngày đặt hàng: <span>{orderDetail && moment(orderDetail.createdAt).format('DD-MM-YYYY')}</span></label>
                </div>
                <div className="order__detail-group">
                    <Row>
                        {orderItems && orderItems.map((item, index)=>{
                            const {id, product_name, product_image, price, qty} = item;

                            return (
                                <Col xs={6} className='' key={index}>
                                    <div className="order__detail-item" key={index}>
                                        <img src={`http://localhost:8080/static/images/${product_image}`} alt="" />
                                        <div className="detail-item-info">
                                            <label>Tên sản phẩm: <span>{product_name}</span></label>
                                            <label>Số lượng: <span>{qty}</span></label>
                                        </div>
                                    </div>
                                </Col>
                            )
                        })}
                    </Row>
                </div>
                <div className="order__detail-foot">
                    <div className="order__detail-status">
                        <label>Trạng thái đơn hàng:
                            <span className='order-status'>{orderDetail &&  orderDetail.status}</span>
                        </label>
                        <label>
                            Tổng thanh toán:
                            <span>{orderDetail && orderDetail.total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                        </label>
                        <label>
                            Trạng thái thanh toán:
                            <span>{orderDetail && orderDetail.is_payment ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                        </label>
                    </div>
                    <div className="order__detail-group-btn">
                        <button disabled={(orderDetail && orderDetail.status !== statusOrder.NEW)} className="btn btn-confirm"
                            onClick={()=>handleConfirmOrder(orderDetail && orderDetail.id)}>Nhận đơn</button>

                        <button disabled={orderDetail && orderDetail.status !== statusOrder.CONFIRMED} className="btn btn-processing" 
                            onClick={()=>handleProcessingOrder(orderDetail && orderDetail.id)}>Đang làm</button>

                        <button disabled={orderDetail && orderDetail.status !== statusOrder.PROCESSING} className="btn btn-complete"
                            onClick={()=>handleCompleteOrder(orderDetail && orderDetail.id)}>Hoàn thành</button>
                            
                        <button hidden={orderDetail && orderDetail.is_payment} className="btn"
                            onClick={()=>handlePayment(orderDetail && orderDetail.id)}>Đã thanh toán</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderDetail;
