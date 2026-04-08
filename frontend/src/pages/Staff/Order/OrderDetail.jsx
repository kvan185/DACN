import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Table } from 'react-bootstrap';
import moment from 'moment';

import { fetchUpdateIsPayment, fetchUpdateStatusOrder } from '../../../actions/order';
import { statusOrder } from '../../../config/statusOrder';
import SplitBillModal from '../../../components/SplitBillModal';
import '../../../scss/admin/admin-theme.scss';
import './order.scss';

function OrderDetail(props) {
    const [orderDetail, setOrderDetail] = useState(null);
    const [orderStatus, setOrderStatus] = useState(null);
    const [orderPayment, setOrderPayment] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [showSplit, setShowSplit] = useState(false);
    const { orderId } = useParams();
    const accessToken = sessionStorage.getItem("accessToken");

    useEffect(() => {
        if (orderId && accessToken) {
            fetchOrderDetail(orderId, accessToken);
        }
    }, [orderId, accessToken, orderStatus, orderPayment]);

    const fetchOrderDetail = async (orderId, accessToken) => {
        const response = await fetch(`/api/order/${orderId}`, {
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        const data = await response.json();
        console.log(data)

        if (data) {
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

    const handleSplitPayment = async (splitId) => {
        try {
            const resp = await fetch('/api/payment/split/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ orderId: orderDetail.id || orderDetail._id, splitId, method: 'cash' })
            });
            const data = await resp.json();
            if (data.success) {
                fetchOrderDetail(orderId, accessToken);
            } else {
                alert(data.message || "Lỗi thanh toán phần chia bill");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <React.Fragment>
            <div className='order__detail'>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="title-admin mb-0">Chi tiết Hóa Đơn: #{orderDetail && orderDetail.id}</h3>
                    <button className="btn btn-dark d-flex align-items-center shadow-sm" onClick={() => window.print()}>
                        <span className="me-2 fs-5">🖨️</span> In Hóa Đơn
                    </button>
                </div>

                <div className="order__detail-container background-radius shadow-sm bg-white print-section">
                    
                    {/* Print Header */}
                    <div className="text-center mb-4 border-bottom pb-3">
                        <h2 className="fw-bold text-uppercase mb-1" style={{color: '#2c3e50'}}>Healthy Food Restaurant</h2>
                        <p className="text-muted mb-0">Địa chỉ: 123 Đường Ẩm Thực, Quận 1, TP. HCM</p>
                        <p className="text-muted mb-0">Hotline: 0909 123 456</p>
                        <h4 className="mt-3 fw-bold text-dark">HÓA ĐƠN THANH TOÁN</h4>
                        <p className="text-muted mb-0">Hóa đơn #: {orderDetail && orderDetail.id}</p>
                    </div>

                    <div className="order__detail-head border p-3 rounded bg-light mb-4">
                        <Row>
                            <Col md={6}>
                                <label className="text-muted mb-1 d-block">Tên khách hàng:</label>
                                <div className="fw-bold fs-5">{orderDetail && orderDetail.first_name} {orderDetail && orderDetail.last_name}</div>
                                {orderDetail && orderDetail.table_number && (
                                    <div className="mt-2 text-primary fw-bold">🏠 Bàn số: {orderDetail.table_number}</div>
                                )}
                            </Col>
                            <Col md={6} className="text-md-end">
                                <label className="text-muted mb-1 d-block">Ngày đặt hàng:</label>
                                <div className="fw-bold fs-6">{orderDetail && moment(orderDetail.createdAt).format('DD/MM/YYYY HH:mm')}</div>
                            </Col>
                        </Row>
                    </div>
                    
                    <div className="order__detail-group mt-3">
                        <Table striped hover className="text-end align-middle border-bottom table-borderless">
                            <thead className="table-dark text-white">
                                <tr>
                                    <th className="text-center column-stt">STT</th>
                                    <th className="text-start">Tên sản phẩm</th>
                                    <th className="text-center">Số lượng</th>
                                    <th>Đơn giá</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="border-top-0">
                                {orderItems && orderItems.length > 0 ? (
                                    orderItems.map((item, index) => {
                                        const { product_name, price, qty } = item;
                                        const subtotal = (price || 0) * (qty || 0);

                                        return (
                                            <tr key={index}>
                                                <td className="text-center">{index + 1}</td>
                                                <td className="text-start fw-bold text-dark">{product_name}</td>
                                                <td className="text-center fw-bold text-primary">{qty}</td>
                                                <td className="text-muted">{price ? price.toLocaleString('vi', { style: 'currency', currency: 'VND' }) : 'N/A'}</td>
                                                <td className="fw-bold text-dark">{subtotal ? subtotal.toLocaleString('vi', { style: 'currency', currency: 'VND' }) : 'N/A'}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center">Không có sản phẩm nào</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                    
                    {orderDetail && orderDetail.split_bills && orderDetail.split_bills.length > 0 && (
                        <div className="order__detail-group mt-4 p-3 border rounded border-warning">
                            <h5 className="text-warning font-bold mb-3">Thông tin Chia Bill</h5>
                            <Table bordered size="sm" className="text-center align-middle">
                                <thead className="table-warning">
                                    <tr>
                                        <th>Người thanh toán</th>
                                        <th>Tiền</th>
                                        <th>Món ăn</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderDetail.split_bills.map((sb, sbIdx) => (
                                        <tr key={sbIdx}>
                                            <td className="fw-bold">{sb.user_name} <br/><small className="text-muted">({sb.percent}%)</small></td>
                                            <td className="text-danger fw-bold">{sb.amount.toLocaleString()} đ</td>
                                            <td className="text-start" style={{fontSize: '12px'}}>
                                                {sb.items && sb.items.map((it, idx) => (
                                                    <div key={idx}>- {it.product_name} x {it.qty}</div>
                                                ))}
                                                {(!sb.items || sb.items.length === 0) && "Không áp dụng món"}
                                            </td>
                                            <td>
                                                <span className={`badge ${sb.is_payment ? 'bg-success' : 'bg-secondary'}`}>
                                                    {sb.is_payment ? 'Đã thu' : 'Chưa thu'}
                                                </span>
                                            </td>
                                            <td>
                                                {!sb.is_payment && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleSplitPayment(sb.split_id)}>Thu tiền</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    <div className="order__detail-foot mt-4 pb-3 border-bottom-0">
                        <div className="order__detail-status bg-light p-4 rounded w-100 d-flex flex-column align-items-end">
                            <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                                <span className="text-muted">Trạng thái đơn hàng:</span>
                                <span className='order-status fw-bold fs-6'>{orderDetail && orderDetail.status}</span>
                            </div>
                            <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                                <span className="text-muted">Trạng thái thanh toán:</span>
                                <span className={`badge ${orderDetail && orderDetail.is_payment ? 'bg-success' : 'bg-danger'} fs-6`}>
                                    {orderDetail && orderDetail.is_payment ? 'Đã thanh toán đủ' : 'Chưa thu đủ'}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                                <span className="text-muted">Phương thức thanh toán:</span>
                                <span className="fw-bold fs-6 text-capitalize text-primary">
                                    {orderDetail && (orderDetail.payment_method || "N/A")}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between w-100 mt-2 align-items-center">
                                <span className="fw-bold fs-5 text-dark">Tổng Cần Thu:</span>
                                <h2 className="text-danger fw-bold mb-0">
                                    {orderDetail && orderDetail.total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="order__detail-group-btn mt-3 no-print d-flex justify-content-end bg-light p-3 rounded">
                        <button disabled={(orderDetail && orderDetail.status !== statusOrder.NEW)} className="btn btn-confirm"
                            onClick={() => handleConfirmOrder(orderDetail && orderDetail.id)}>Bếp Nhận Đơn</button>

                        <button disabled={orderDetail && orderDetail.status !== statusOrder.CONFIRMED} className="btn btn-processing"
                            onClick={() => handleProcessingOrder(orderDetail && orderDetail.id)}>Đang làm</button>

                        <button disabled={orderDetail && orderDetail.status !== statusOrder.PROCESSING} className="btn btn-complete"
                            onClick={() => handleCompleteOrder(orderDetail && orderDetail.id)}>Hoàn thành</button>

                        <button hidden={orderDetail && orderDetail.is_payment} className="btn btn-payment"
                            onClick={() => handlePayment(orderDetail && orderDetail.id)}>Đã thanh toán</button>
                            
                        {orderDetail && !orderDetail.is_payment && (!orderDetail.split_bills || orderDetail.split_bills.length === 0) && (
                            <button className="btn btn-warning ms-2 text-white font-bold px-3 py-2" onClick={() => setShowSplit(true)}>
                                Mở chia hóa đơn
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <SplitBillModal 
                show={showSplit} 
                onHide={() => setShowSplit(false)} 
                order={orderDetail} 
                orderItems={orderItems}
                onSuccess={() => fetchOrderDetail(orderId, accessToken)}
            />
        </React.Fragment>
    );
}

export default OrderDetail;
