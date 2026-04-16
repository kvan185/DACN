import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { visibilityOrderedList } from '../../../actions/user';
import { fetchGetGuestOrdersByTable, fetchGuestPayment } from '../../../actions/order';
import { socket } from '../../../socket';
import './orderedList.scss';

function OrderedList() {
    const isOrderedList = useSelector(state => state.user.isOrderedList);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    const tableNumber = sessionStorage.getItem('tableNumber');

    const handleHiddenList = () => {
        dispatch(visibilityOrderedList(false));
    };

    const loadOrders = async () => {
        if (!tableNumber) return;
        setLoading(true);
        try {
            let sessionId = null;
            const sessionStr = sessionStorage.getItem('guest_session');
            if (sessionStr) {
                const sessionObj = JSON.parse(sessionStr);
                sessionId = sessionObj.sessionId;
            }
            const data = await fetchGetGuestOrdersByTable(tableNumber, sessionId);
            if (data) {
                setOrders(data);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOrderedList) {
            loadOrders();
            // Refresh every 30 seconds while open as fallback
            const interval = setInterval(loadOrders, 30000);

            // Listen to real-time events
            const handleUpdate = () => loadOrders();
            socket.on('itemStatusUpdated', handleUpdate);
            socket.on('paymentSuccess', handleUpdate);

            return () => {
                clearInterval(interval);
                socket.off('itemStatusUpdated', handleUpdate);
                socket.off('paymentSuccess', handleUpdate);
            };
        }
    }, [isOrderedList]);

    useEffect(() => {
        if (isOrderedList) {
            document.body.style.overflowY = 'hidden';
        } else {
            document.body.style.overflowY = '';
        }
    }, [isOrderedList]);

    const handlePayment = () => {
        // Collect all items from all unpaid orders for the table
        const allItems = [];
        orders.forEach(group => {
            group.orderItems.forEach(item => {
                allItems.push({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    price: item.price,
                    qty: item.qty,
                    total_price: item.total_price
                });
            });
        });

        if (allItems.length === 0) {
            alert('Không có món nào để thanh toán!');
            return;
        }

        dispatch(visibilityOrderedList(false));
        navigate('/checkout', { state: { guestItems: allItems, isFullTablePayment: true, orderSource: 'table' } });
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Chờ xác nhận';
            case 'processing': return 'Đang nấu';
            case 'completed': return 'Hoàn thành';
            case 'canceled': return 'Đã hủy';
            default: return status;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return 'status-pending';
            case 'processing': return 'status-processing';
            case 'completed': return 'status-completed';
            case 'canceled': return 'status-canceled';
            default: return '';
        }
    };

    const totalBill = orders.reduce((sum, group) => sum + group.order.total_price, 0);

    return (
        <>
            <div className={`bg-gradient ${isOrderedList ? 'show' : ''}`} onClick={handleHiddenList}></div>
            <div className={`block-ordered-list ${isOrderedList ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="btn-close-list" onClick={handleHiddenList}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path opacity="0.5" d="M10.3551 7.5L14.6165 11.7614C14.8722 12.017 15 12.358 15 12.6989C15 13.0824 14.8722 13.4233 14.6165 13.679L13.679 14.6165C13.3807 14.8722 13.0398 15 12.6989 15C12.3153 15 12.017 14.8722 11.7614 14.6165L7.5 10.3551L3.23864 14.6165C2.98295 14.8722 2.64205 15 2.30114 15C1.91761 15 1.5767 14.8722 1.32102 14.6165L0.383523 13.679C0.127841 13.4233 0 13.0824 0 12.6989C0 12.358 0.127841 12.017 0.383523 11.7614L4.64489 7.5L0.383523 3.23864C0.127841 2.98295 0 2.68466 0 2.30114C0 1.96023 0.127841 1.61932 0.383523 1.32102L1.32102 0.383523C1.5767 10.127841 1.91761 0 2.30114 0C2.64205 0 2.98295 0.127841 3.23864 0.383523L7.5 4.64489L11.7614 0.383523C12.017 0.127841 12.3153 0 12.6989 0C13.0398 0 13.3807 0.127841 13.679 0.383523L14.6165 1.32102C14.8722 1.61932 15 1.96023 15 2.30114C15 2.68466 14.8722 2.98295 14.6165 3.23864L10.3551 7.5Z" fill="#1AC073" />
                    </svg>
                </div>

                <div className="list-title">
                    <h3>Món đã đặt</h3>
                    <p>Bàn số: {tableNumber}</p>
                </div>

                <div className="list-main">
                    {loading && orders.length === 0 ? (
                        <p className="text-center">Đang tải...</p>
                    ) : orders.length > 0 ? (
                        orders.map((group, idx) => {
                            // Gom nhóm các món theo batch_num (đợt gọi món)
                            const batches = {};
                            group.orderItems.forEach(item => {
                                const bNum = item.batch_num || 1;
                                if (!batches[bNum]) batches[bNum] = [];
                                batches[bNum].push(item);
                            });

                            return (
                                <div key={group.order.id} className="order-group-container">
                                    {Object.keys(batches).sort((a, b) => a - b).map(bNum => (
                                        <div key={bNum} className="order-group">
                                            <div className="order-header">
                                                <span className="order-time fw-bold">
                                                    {new Date(batches[bNum][0].createdAt || group.order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="order-status fw-bold text-primary">
                                                    Lần gọi món thứ {bNum}
                                                </span>
                                            </div>
                                            <div className="order-items">
                                                {batches[bNum].map((item, itemIdx) => (
                                                    <div key={itemIdx} className="order-item d-flex align-items-center flex-wrap">
                                                        <span className="item-name flex-grow-1" style={{width: '50%'}}>{item.product_name}</span>
                                                        <span className="item-qty text-center" style={{width: '15%'}}>x{item.qty}</span>
                                                        <span className="item-price text-end" style={{width: '35%'}}>
                                                            {item.total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                                        </span>
                                                        <div className="w-100 mt-1 d-flex justify-content-start">
                                                            <span className={`badge border ${item.status === 'CANCELED' ? 'bg-danger text-white' : 'bg-light text-dark'}`} style={{fontSize: '11px'}}>
                                                                Trạng thái: {
                                                                    item.status === 'CANCELED' ? 'Đã hủy (Sự cố)' :
                                                                    item.status === 'SERVED' ? 'Đã phục vụ' :
                                                                    item.status === 'PREPARING' ? 'Đang chuẩn bị' : 'Chờ xác nhận'
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    ) : (
                        <h4 className="list-no-item">(Chưa có món nào được đặt)</h4>
                    )}
                </div>

                {orders.length > 0 && (
                    <div className="list-footer">
                        <div className="list-total">
                            <span>Tổng cộng</span>
                            <span className="total-price">
                                {totalBill.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                            </span>
                        </div>
                        <button onClick={handlePayment} className="btn-payment-all">
                            Thanh toán tất cả
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

export default OrderedList;
