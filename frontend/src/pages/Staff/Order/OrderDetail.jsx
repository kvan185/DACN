import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Table, Form } from 'react-bootstrap';
import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';

import { fetchUpdateIsPayment, fetchUpdateStatusOrder } from '../../../actions/order';
import { statusOrder } from '../../../config/statusOrder';
import SplitBillModal from '../../../components/SplitBillModal';
import { socket } from '../../../socket';
import '../../../scss/admin/admin-theme.scss';
import './order.scss';

function OrderDetail(props) {
    const [orderDetail, setOrderDetail] = useState(null);
    const [orderStatus, setOrderStatus] = useState(null);
    const [orderPayment, setOrderPayment] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [showSplit, setShowSplit] = useState(false);
    const [splitPaymentMethods, setSplitPaymentMethods] = useState({});
    const [printSplitBill, setPrintSplitBill] = useState(null);
    const [qrModalData, setQrModalData] = useState(null);
    const [mainQrData, setMainQrData] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const { orderId } = useParams();
    const accessToken = sessionStorage.getItem("accessToken");

    useEffect(() => {
        if (orderId && accessToken) {
            fetchOrderDetail(orderId, accessToken).then(res => {
                if (res && res.status === 200) {
                    setOrderDetail(res.data.order);
                    setOrderStatus(res.data.order.status);
                    setOrderPayment(res.data.order.is_payment);
                    setOrderItems(res.data.orderItems || []);
                }
            });
        }
    }, [orderId, accessToken]);

    useEffect(() => {
        // Lắng nghe sự kiện thanh toán thành công từ Socket.io
        socket.on('paymentSuccess', (data) => {
            if (!orderDetail) return;
            
            // Kiểm tra xem đơn hàng thành công có phải là đơn hàng đang xem hoặc split bill của đơn này không
            const isMainOrder = data.orderCode === orderDetail.payos_order_code;
            const isSplitOrder = orderDetail.split_bills && orderDetail.split_bills.some(sb => sb.payos_order_code === data.orderCode);

            if (isMainOrder || isSplitOrder) {
                toast.success(`Đơn hàng #${orderDetail.id} đã được thanh toán thành công!`);
                setMainQrData(null);
                setQrModalData(null);
                setIsZoomed(false);
                
                // Refresh data
                if (orderId && accessToken) {
                    fetchOrderDetail(orderId, accessToken).then(res => {
                        if (res && res.status === 200) {
                            setOrderDetail(res.data.order);
                            setOrderPayment(res.data.order.is_payment);
                        }
                    });
                }
            }
        });

        return () => {
            socket.off('paymentSuccess');
        };
    }, [orderDetail, orderId, accessToken]);

    const fetchOrderDetail = async (orderId, accessToken) => {
        const response = await fetch(`/api/order/${orderId}`, {
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        const data = await response.json();

        if (data) {
            setOrderDetail(data.order);
            setOrderItems(data.orderItems);
            return { status: 200, data: data };
        }
        return { status: 404 };
    }

    const handleConfirmOrder = async (orderId) => {
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.CONFIRMED);
            if (result.status === 200) {
                setOrderStatus("CONFIRMED");
                fetchOrderDetail(orderId, accessToken);
                return;
            }
        }
    }

    const handleProcessingOrder = async (orderId) => {
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.PROCESSING);
            if (result.status === 200) {
                setOrderStatus("PROCESSING");
                fetchOrderDetail(orderId, accessToken);
                return;
            }
        }
    }

    const handleCompleteOrder = async (orderId) => {
        if (orderId && accessToken) {
            var result = await fetchUpdateStatusOrder(orderId, accessToken, statusOrder.COMPLETED);
            if (result.status === 200) {
                setOrderStatus("COMPLETED");
                fetchOrderDetail(orderId, accessToken);
                return;
            }
        }
    }

    const handlePayment = async (orderId) => {
        if (orderId) {
            var result = await fetchUpdateIsPayment(orderId, true);
            if (result.status === 200) {
                setOrderPayment(true);
                fetchOrderDetail(orderId, accessToken);
            }
        }
    }

    const handleSplitPayment = async (splitId) => {
        const method = splitPaymentMethods[splitId] || 'transfer';

        if (method === 'transfer') {
            try {
                const resp = await fetch('/api/payment/split/pay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                    body: JSON.stringify({ orderId: orderDetail.id || orderDetail._id, splitId, method: 'transfer' })
                });
                const data = await resp.json();
                if (data.success && data.paymentUrl) {
                    const sb = orderDetail.split_bills.find(s => s.split_id === splitId);
                    setQrModalData({ paymentUrl: data.paymentUrl, qrCode: data.qrCode || data.paymentUrl, splitId, amount: sb.amount });
                } else {
                    alert(data.message || "Lỗi tạo mã QR");
                }
            } catch (e) {
                console.error(e);
            }
            return;
        }

        processSplitPayment(splitId, method);
    };

    const handleMainPaymentQR = async () => {
        try {
            let data;
            const cartId = orderDetail.cart_id;
            if (orderDetail.order_source === 'table') {
                const resp = await fetch('/api/payment/table', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tableNumber: orderDetail.table_number })
                });
                data = await resp.json();
            } else {
                const resp = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cartId: cartId })
                });
                data = await resp.json();
            }

            if (data && data.paymentUrl) {
                setMainQrData({ 
                    paymentUrl: data.paymentUrl, 
                    qrCode: data.qrCode || data.paymentUrl,
                    amount: orderDetail.total_price 
                });
            } else {
                alert(data.message || "Không thể tạo mã QR thanh toán");
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi kết nối khi tạo QR");
        }
    };

    const processSplitPayment = async (splitId, method) => {
        try {
            const resp = await fetch('/api/payment/split/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ orderId: orderDetail.id || orderDetail._id, splitId, method })
            });
            const data = await resp.json();
            if (data.success) {
                await fetchOrderDetail(orderId, accessToken);
                setQrModalData(null);

                if (window.confirm("Thanh toán thành công. Bạn có muốn in hóa đơn cho khách này không?")) {
                    setTimeout(() => {
                        setPrintSplitBill(splitId);
                    }, 300);
                }
            } else {
                alert(data.message || "Lỗi thanh toán phần chia bill");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const targetPrintBill = printSplitBill && typeof printSplitBill === 'string' ? orderDetail?.split_bills?.find(s => s.split_id === printSplitBill) : printSplitBill;

    useEffect(() => {
        if (targetPrintBill && typeof printSplitBill === 'string') {
            setPrintSplitBill(targetPrintBill);
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [orderDetail, printSplitBill, targetPrintBill]);

    useEffect(() => {
        const handleAfterPrint = () => {
            if (printSplitBill) {
                setPrintSplitBill(null);
            }
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, [printSplitBill]);

    if (targetPrintBill) {
        return (
            <div className="bg-white p-4 print-section" style={{ minHeight: '100vh', color: '#000' }}>
                <div className="text-center mb-4 border-bottom pb-3">
                    <h2 className="fw-bold text-uppercase mb-1" style={{ color: '#2c3e50' }}>Healthy Food Restaurant</h2>
                    <p className="text-muted mb-0">Địa chỉ: 123 Đường Ẩm Thực, Quận 1, TP. HCM</p>
                    <p className="text-muted mb-0">Hotline: 0909 123 456</p>
                    <h4 className="mt-3 fw-bold text-dark text-uppercase">HÓA ĐƠN THANH TOÁN (PHẦN CHIA)</h4>
                    <p className="text-muted mb-0">Hóa đơn #: {orderDetail.id}</p>
                    <p className="text-muted mb-0 fw-bold mt-1">Người thanh toán: {targetPrintBill.user_name}</p>
                </div>
                <Table striped className="text-end align-middle table-borderless mt-3 border-bottom pb-3">
                    <thead className="table-dark text-white">
                        <tr>
                            <th className="text-start">Tên sản phẩm</th>
                            <th className="text-center">SL</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {targetPrintBill.split_type === 'item' ? (
                            targetPrintBill.items && targetPrintBill.items.map((it, idx) => (
                                <tr key={idx}>
                                    <td className="text-start fw-bold text-dark">{it.product_name}</td>
                                    <td className="text-center fw-bold">{it.qty}</td>
                                    <td className="text-muted">{(it.unit_price || Math.floor(it.price / it.qty))?.toLocaleString()} đ</td>
                                    <td className="fw-bold text-dark">{it.price?.toLocaleString()} đ</td>
                                </tr>
                            ))
                        ) : (
                            orderItems && orderItems.map((it, idx) => (
                                <tr key={idx}>
                                    <td className="text-start fw-bold text-dark">{it.product_name || it.name}</td>
                                    <td className="text-center fw-bold">{it.qty}</td>
                                    <td className="text-muted">{(it.unit_price || Math.floor(it.price / it.qty))?.toLocaleString()} đ</td>
                                    <td className="fw-bold text-dark">{(it.price || 0).toLocaleString()} đ</td>
                                </tr>
                            ))
                        )}
                        {(!targetPrintBill.items || targetPrintBill.items.length === 0) && targetPrintBill.split_type === 'item' && (
                            <tr><td colSpan="4" className="text-center text-muted">Thanh toán theo giá trị tùy chỉnh</td></tr>
                        )}
                    </tbody>
                </Table>

                {targetPrintBill.split_type !== 'item' && (
                    <div className="d-flex justify-content-between w-100 mt-2 align-items-center mb-1">
                        <span className="text-muted">Tổng bill gốc:</span>
                        <span className="fw-bold fs-6">{(orderDetail?.total_price || 0).toLocaleString()} đ</span>
                    </div>
                )}

                {targetPrintBill.split_type !== 'item' && (
                    <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                        <span className="text-muted fst-italic">Phần share bill ({targetPrintBill.split_type === 'even' ? `Chia đều ${orderDetail.split_bills.length}` : `Tỷ lệ ${targetPrintBill.percent}%`}):</span>
                        <span className="fw-bold text-primary">{(targetPrintBill.percent || (100 / orderDetail.split_bills.length)).toFixed(1)}%</span>
                    </div>
                )}

                <div className="d-flex justify-content-between w-100 mt-3 align-items-center">
                    <span className="fw-bold fs-5 text-dark">Khách Phải Thanh Toán:</span>
                    <h2 className="text-danger fw-bold mb-0">{targetPrintBill.amount?.toLocaleString()} đ</h2>
                </div>
                <div className="text-center mt-5 pt-3">
                    <p className="fst-italic text-muted">Cảm ơn và hẹn gặp lại!</p>
                </div>
                <div className="mt-5 text-center no-print">
                    <button className="btn btn-primary" onClick={() => setPrintSplitBill(null)}>Thoát Chế Độ In</button>
                </div>
            </div>
        );
    }

    const handleShareBill = () => {
        if (!orderDetail) return;
        const itemsText = orderItems.map(item => `- ${item.product_name} x ${item.qty}: ${item.total_price?.toLocaleString()}đ`).join('\n');
        const shareText = `--- THÔNG TIN ${(orderDetail.is_payment ? 'HÓA ĐƠN' : 'TẠM TÍNH')} ---\n` +
            `Số bàn: ${orderDetail.table_number || 'N/A'}\n` +
            `Khách hàng: ${orderDetail.first_name} ${orderDetail.last_name}\n` +
            `------------------\n` +
            `${itemsText}\n` +
            `------------------\n` +
            `Tổng cộng: ${orderDetail.total_price?.toLocaleString()}đ\n` +
            `Trạng thái: ${orderDetail.is_payment ? 'Đã thanh toán' : 'Chưa thanh toán'}\n` +
            `Xem thực đơn tại: ${window.location.origin}/menu?table=${orderDetail.table_number}`;

        navigator.clipboard.writeText(shareText).then(() => {
            alert("Đã sao chép tóm tắt đơn hàng vào bộ nhớ tạm!");
        }).catch(err => {
            console.error('Lỗi khi sao chép:', err);
        });
    }

    return (
        <React.Fragment>
            {qrModalData && (
                <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center" style={{ zIndex: 1050 }}>
                    <div className="vietqr-card">
                        <div className="card-header-branding">
                            <img src="/logos/vietqr_logo.png" alt="VietQR" className="vietqr-logo" />
                            <img src="/logos/mb_logo.png" alt="MB Bank" className="mb-logo-text" />
                        </div>

                        <div className="qr-main-container">
                            <QRCodeSVG 
                                value={qrModalData.qrCode || qrModalData.paymentUrl} 
                                size={220} 
                                level="H"
                                imageSettings={{
                                    src: "/logos/mb_logo.png",
                                    x: undefined,
                                    y: undefined,
                                    height: 33,
                                    width: 33,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <div className="card-footer-info">
                            <div className="account-name">Chủ tài khoản:</div>
                            <div className="user-fullname">NGUYỄN KHÁNH VĂN</div>
                            <div className="amount-display">
                                {qrModalData.amount.toLocaleString()} VNĐ
                            </div>
                            <div className="mt-3 text-secondary" style={{fontSize: '12px'}}>
                                Ngân hàng Quân Đội (MB Bank)
                            </div>
                        </div>

                        <div className="d-flex justify-content-center gap-2 mt-3">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setQrModalData(null)}>Hủy</button>
                            <button className="btn btn-sm btn-success fw-bold" onClick={() => processSplitPayment(qrModalData.splitId, 'manual_transfer')}>Đã nhận tiền</button>
                        </div>
                    </div>
                </div>
            )}

            {mainQrData && (
                <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center" style={{ zIndex: 1100 }}>
                    <div className={isZoomed ? "modal-qr-zoomed w-100" : ""}>
                        <div className="vietqr-card shadow-lg" style={{ minWidth: isZoomed ? '500px' : '400px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <img src="/logos/vietqr_logo.png" alt="VietQR" style={{ height: '30px' }} />
                                <button className="btn-close" onClick={() => { setMainQrData(null); setIsZoomed(false); }}></button>
                            </div>

                            <div 
                                className={`qr-main-container ${isZoomed ? 'zoomed' : ''}`}
                                onClick={() => setIsZoomed(!isZoomed)}
                                style={{ cursor: 'zoom-in' }}
                            >
                                <QRCodeSVG 
                                    value={mainQrData.qrCode || mainQrData.paymentUrl} 
                                    size={isZoomed ? 450 : 250} 
                                    level="H"
                                    imageSettings={{
                                        src: "/logos/mb_logo.png",
                                        x: undefined,
                                        y: undefined,
                                        height: isZoomed ? 64 : 35,
                                        width: isZoomed ? 64 : 35,
                                        excavate: true,
                                    }}
                                />
                            </div>

                            <div className="card-footer-info">
                                <div className="account-name">Người thụ hưởng:</div>
                                <div className="user-fullname">NGUYỄN KHÁNH VĂN</div>
                                <div className="amount-display">
                                    {mainQrData.amount.toLocaleString()} VNĐ
                                </div>
                                <div className="mt-3 text-secondary" style={{fontSize: '12px'}}>
                                    Ngân hàng Quân Đội (MB Bank)
                                </div>
                            </div>
                            
                            <div className="d-flex justify-content-center gap-3 mt-3">
                                <button className="btn btn-outline-secondary" onClick={() => { setMainQrData(null); setIsZoomed(false); }}>Đóng</button>
                                <button className="btn btn-success fw-bold" onClick={() => { 
                                    if (mainQrData.isSplit) {
                                        processSplitPayment(mainQrData.splitId, 'manual_transfer');
                                    } else {
                                        handlePayment(orderDetail.id); 
                                    }
                                    setMainQrData(null); 
                                    setIsZoomed(false);
                                }}>Đã nhận chuyển khoản</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className='order__detail'>
                <div className="d-flex justify-content-between align-items-center mb-4 no-print">
                    <h3 className="title-admin mb-0">
                        {orderDetail && orderDetail.is_payment ? "Chi tiết Hóa Đơn" : "Chi tiết Đơn Hàng"}: #{orderDetail && orderDetail.id}
                    </h3>
                    <div className="d-flex gap-2">
                        <button className="btn btn-info d-flex align-items-center shadow-sm text-white" onClick={handleShareBill}>
                            <span className="me-2 fs-5">🔗</span> Chia sẻ
                        </button>
                        <button className="btn btn-dark d-flex align-items-center shadow-sm" onClick={() => window.print()}>
                            <span className="me-2 fs-5">🖨️</span> {orderDetail && orderDetail.is_payment ? "In Hóa Đơn" : "In Phiêu Mua Hàng"}
                        </button>
                    </div>
                </div>

                <div className="order__detail-container background-radius shadow-sm bg-white print-section">
                    <div className="text-center mb-4 border-bottom pb-3">
                        <h2 className="fw-bold text-uppercase mb-1" style={{ color: '#2c3e50' }}>Healthy Food Restaurant</h2>
                        <p className="text-muted mb-0">Địa chỉ: 123 Đường Ẩm Thực, Quận 1, TP. HCM</p>
                        <p className="text-muted mb-0">Hotline: 0909 123 456</p>
                        <h4 className="mt-3 fw-bold text-dark text-uppercase">
                            {orderDetail && orderDetail.is_payment ? "Hóa Đơn Thanh Toán" : "Phiếu mua hàng (Tạm tính)"}
                        </h4>
                        <p className="text-muted mb-0">
                            {orderDetail && orderDetail.is_payment ? "Hóa đơn #" : "Phiếu mua hàng #"}: {orderDetail && orderDetail.id}
                        </p>
                    </div>

                    <div className="order__detail-head border p-3 rounded bg-light mb-4 d-flex justify-content-between align-items-center flex-wrap">
                        <div className="d-flex align-items-center gap-4">
                            <div>
                                <span className="text-muted me-1">Tên khách hàng:</span>
                                <span className="fw-bold fs-5">{orderDetail && orderDetail.first_name} {orderDetail && orderDetail.last_name}</span>
                            </div>
                            {orderDetail && orderDetail.table_number && (
                                <div className="text-primary fw-bold fs-5" style={{ borderLeft: '2px solid #ccc', paddingLeft: '20px' }}>
                                    Bàn số: {orderDetail.table_number}
                                </div>
                            )}
                        </div>
                        <div>
                            <span className="text-muted me-1">Ngày đặt hàng:</span>
                            <span className="fw-bold fs-6">{orderDetail && moment(orderDetail.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                    </div>

                    <div className="order__detail-group mt-3">
                        <Table striped hover className="text-end align-middle border-bottom table-borderless">
                            <thead className="table-dark">
                                <tr>
                                    <th className="text-center column-stt" style={{ color: '#fff' }}>STT</th>
                                    <th className="text-start" style={{ color: '#fff' }}>Tên sản phẩm</th>
                                    <th className="text-center" style={{ color: '#fff' }}>Số lượng</th>
                                    <th style={{ color: '#fff' }}>Đơn giá</th>
                                    <th style={{ color: '#fff' }}>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderItems && orderItems.length > 0 ? (
                                    orderItems.map((item, index) => {
                                        const { product_name, price, qty } = item;
                                        const subtotal = (price || 0) * (qty || 0);
                                        return (
                                            <tr key={index}>
                                                <td className="text-center">{index + 1}</td>
                                                <td className="text-start fw-bold text-dark">{product_name}</td>
                                                <td className="text-center fw-bold text-primary">{qty}</td>
                                                <td className="text-muted">{price?.toLocaleString()}đ</td>
                                                <td className="fw-bold text-dark">{subtotal?.toLocaleString()}đ</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="5" className="text-center">Không có sản phẩm nào</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {orderDetail && orderDetail.split_bills && orderDetail.split_bills.length > 0 && (
                        <div className="order__detail-group mt-4 p-3 border rounded border-warning">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="text-warning font-bold mb-0">Thông tin Chia Bill</h5>
                                {!orderDetail.is_payment && !orderDetail.split_bills.some(sb => sb.is_payment) && (
                                    <button className="btn btn-sm btn-outline-warning fw-bold d-flex align-items-center" onClick={() => setShowSplit(true)}>
                                        <span className="me-1">✏️</span> Chỉnh sửa
                                    </button>
                                )}
                            </div>
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
                                        <tr key={sbIdx} className={sb.is_payment ? "table-success opacity-75" : ""}>
                                            <td className="fw-bold align-middle">
                                                {sb.user_name} <br />
                                                <small className="text-muted">({sb.percent}%)</small>
                                            </td>
                                            <td className="text-danger fw-bold align-middle">{sb.amount.toLocaleString()} đ</td>
                                            <td className="text-center align-middle" style={{ fontSize: '12px' }}>
                                                {sb.items && sb.items.map((it, idx) => (
                                                    <div key={idx}>- {it.product_name} x {it.qty}</div>
                                                ))}
                                                {(!sb.items || sb.items.length === 0) && "Không áp dụng món"}
                                            </td>
                                            <td className="align-middle text-center">
                                                {sb.is_payment ? (
                                                    <div className="text-success fw-bold py-2">
                                                        <span className="fs-4">✅</span><br/>Thành công
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column align-items-center gap-1">
                                                        {orderDetail.split_bills.length <= 3 ? (
                                                            <div 
                                                                className="p-1 border bg-white rounded cursor-zoom-in"
                                                                onClick={() => setMainQrData({ 
                                                                    paymentUrl: sb.payos_checkout_url || "#", 
                                                                    qrCode: sb.payos_qr_code || sb.payos_checkout_url || "#",
                                                                    amount: sb.amount, 
                                                                    isSplit: true, 
                                                                    splitId: sb.split_id 
                                                                })}
                                                            >
                                                                <QRCodeSVG 
                                                                    value={sb.payos_qr_code || sb.payos_checkout_url} 
                                                                    size={80} 
                                                                    level="H"
                                                                    imageSettings={{
                                                                        src: "/logos/mb_logo.png",
                                                                        x: undefined,
                                                                        y: undefined,
                                                                        height: 12,
                                                                        width: 12,
                                                                        excavate: true,
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="badge bg-secondary">Chưa thanh toán</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="align-middle">
                                                <div className="d-flex justify-content-center align-items-center gap-2 text-center h-100">
                                                    {!sb.is_payment ? (
                                                        <>
                                                            <Form.Select
                                                                size="sm"
                                                                style={{ width: '130px' }}
                                                                value={splitPaymentMethods[sb.split_id] || 'transfer'}
                                                                onChange={(e) => setSplitPaymentMethods({ ...splitPaymentMethods, [sb.split_id]: e.target.value })}
                                                            >
                                                                <option value="transfer">Chuyển khoảnQR</option>
                                                                <option value="cash">Tiền mặt</option>
                                                            </Form.Select>
                                                            <button className="btn btn-sm btn-primary fw-bold" onClick={() => handleSplitPayment(sb.split_id)}>
                                                                Thu tiền
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-success fw-bold fst-italic">
                                                            {sb.payment_method === 'tiền mặt' ? 'Đã trả tiền mặt' : 'Đã chuyển khoản'}
                                                        </span>
                                                    )}
                                                </div>
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
                                <span className={`badge ${orderDetail && orderDetail.is_payment ? 'bg-success' : (orderDetail && orderDetail.split_bills?.some(sb => sb.is_payment) ? 'bg-warning text-dark' : 'bg-danger')} fs-6`}>
                                    {orderDetail && orderDetail.is_payment ? 'Đã thanh toán đủ' : (orderDetail && orderDetail.split_bills?.some(sb => sb.is_payment) ? 'Thanh toán 1 phần' : 'Chưa thu đủ')}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between w-100 mt-2 align-items-center">
                                <span className="fw-bold fs-5 text-dark">Tổng Cần Thu (Số dư nợ):</span>
                                <h2 className="text-danger fw-bold mb-0">
                                    {orderDetail && (
                                        orderDetail.is_payment
                                            ? "0 đ"
                                            : (orderDetail.total_price - (orderDetail.split_bills?.filter(sb => sb.is_payment).reduce((acc, curr) => acc + curr.amount, 0) || 0)).toLocaleString('vi', { style: 'currency', currency: 'VND' })
                                    )}
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
                            <>
                                <button className="btn btn-primary ms-2 text-white font-bold px-3 py-2" onClick={handleMainPaymentQR}>
                                    Thu tiền chuyển khoản (QR)
                                </button>
                                <button className="btn btn-warning ms-2 text-white font-bold px-3 py-2" onClick={() => setShowSplit(true)}>
                                    Mở chia hóa đơn
                                </button>
                            </>
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
            <ToastContainer position="top-right" autoClose={3000} />
        </React.Fragment>
    );
}

export default OrderDetail;
