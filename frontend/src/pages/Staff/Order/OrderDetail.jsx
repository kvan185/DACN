import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Table, Form } from 'react-bootstrap';
import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';

import { fetchUpdateIsPayment, fetchUpdateStatusOrder, fetchPaymentStatus, fetchUpdateItemStatus, fetchUndoSplitPayment, fetchResetSupportRequest } from '../../../actions/order';
import { statusOrder } from '../../../config/statusOrder';
import SplitBillModal from '../../../components/SplitBillModal';
import { socket } from '../../../socket';
import html2pdf from 'html2pdf.js';
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
    const [printMainBill, setPrintMainBill] = useState(false);
    const [printAllSplits, setPrintAllSplits] = useState(false);
    const { orderId } = useParams();
    const accessToken = sessionStorage.getItem("accessToken");

    const leftColPercent = import.meta.env.VITE_ORDER_LEFT_COL_PERCENT || 40;
    const rightColPercent = import.meta.env.VITE_ORDER_RIGHT_COL_PERCENT || 60;

    const handleUpdateItemStatus = async (itemId, newStatus) => {
        const res = await fetchUpdateItemStatus(orderDetail.id || orderDetail._id, itemId, newStatus, accessToken);
        if (res && res.success) {
            fetchOrderDetail(orderId, accessToken);
        } else {
            toast.error(res?.message || 'Lỗi cập nhật trạng thái món');
        }
    };

    const handleUndoSplit = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy chia bill và gộp lại thành 1 hóa đơn tổng không?")) return;
        try {
            const res = await fetchUndoSplitPayment(orderDetail.id || orderDetail._id, accessToken);
            if (res && res.success) {
                toast.success(res.message);
                fetchOrderDetail(orderId, accessToken);
            } else {
                toast.error(res?.message || 'Lỗi hủy chia hóa đơn');
            }
        } catch (error) {
            toast.error('Lỗi hệ thống');
        }
    };

    const slipItems = orderItems.filter(item => !item.status || (item.status !== 'SERVED' && item.status !== 'CANCELED'));
    const receiptItems = orderItems.filter(item => item.status === 'SERVED');
    const canceledItems = orderItems.filter(item => item.status === 'CANCELED');

    const slipBatches = {};
    slipItems.forEach(item => {
        const key = `Batch ${item.batch_num || 1} - ${item.guest_name || orderDetail?.guest_name || 'Khách chung'}`;
        if (!slipBatches[key]) slipBatches[key] = [];
        slipBatches[key].push(item);
    });

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
                    fetchOrderDetail(orderId, accessToken);
                }
            }
        });

        return () => {
            socket.off('paymentSuccess');
        };
    }, [orderDetail, orderId, accessToken]);

    useEffect(() => {
        let intervalId;
        const activeModal = mainQrData || qrModalData;
        if (activeModal && activeModal.orderCode) {
            intervalId = setInterval(async () => {
                try {
                    const res = await fetchPaymentStatus(activeModal.orderCode);
                    if (res && res.success && res.data && res.data.status === 'PAID') {
                        clearInterval(intervalId);
                        setMainQrData(null);
                        setQrModalData(null);
                        setIsZoomed(false);
                        toast.success(`Giao dịch quét mã QR nhận tiền thành công!`);
                        if (orderId && accessToken) {
                            fetchOrderDetail(orderId, accessToken);
                        }
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                }
            }, 3000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [mainQrData, qrModalData, orderId, accessToken]);

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

    const handleResetSupport = async () => {
        if (!orderDetail) return;
        const res = await fetchResetSupportRequest(orderDetail.id || orderDetail._id, accessToken);
        if (res && res.success) {
            toast.success(res.message);
            fetchOrderDetail(orderId, accessToken);
        } else {
            toast.error(res?.message || 'Lỗi xử lý yêu cầu');
        }
    };

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

    const handlePayment = async (orderId, method = 'tiền mặt') => {
        if (orderId) {
            var result = await fetchUpdateIsPayment(orderId, true, method);
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
                    setQrModalData({
                        paymentUrl: data.paymentUrl,
                        qrCode: data.qrCode || data.paymentUrl,
                        splitId,
                        amount: sb.amount,
                        orderCode: data.orderCode
                    });
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
                    amount: orderDetail.total_price,
                    orderCode: data.orderCode
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
    const isPrinting = targetPrintBill || printMainBill || printAllSplits;

    useEffect(() => {
        if (isPrinting) {
            setTimeout(() => {
                const element = document.querySelector('.print-section');
                if (element) {
                    const noPrintElements = element.querySelectorAll('.no-print');
                    noPrintElements.forEach(el => el.style.display = 'none');
                    element.classList.add('receipt-layout');

                    const toastId = toast.loading("Đang xuất file PDF...", { autoClose: false });

                    let filename = `HoaDon_${orderDetail?.id}.pdf`;
                    if (targetPrintBill) filename = `HoaDon_ChiaCho_${targetPrintBill?.user_name || 'Khach'}.pdf`;
                    if (printAllSplits) filename = `HoaDon_TatCaPhanChia_${orderDetail?.id}.pdf`;

                    const opt = {
                        margin: 0,
                        filename: filename,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 3, useCORS: true, logging: false },
                        jsPDF: { unit: 'mm', format: [80, 250], orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(element).outputPdf('bloburl').then((pdfUrl) => {
                        toast.update(toastId, { render: "Đã xuất PDF!", type: "success", isLoading: false, autoClose: 3000 });
                        window.open(pdfUrl, '_blank');
                    }).catch(err => {
                        console.error('Lỗi xuất PDF:', err);
                        toast.update(toastId, { render: "Lỗi xuất PDF", type: "error", isLoading: false, autoClose: 3000 });
                    }).finally(() => {
                        noPrintElements.forEach(el => el.style.display = '');
                        element.classList.remove('receipt-layout');
                        setPrintSplitBill(null);
                        setPrintMainBill(false);
                        setPrintAllSplits(false);
                    });
                }
            }, 500);
        }
    }, [orderDetail, printSplitBill, targetPrintBill, printMainBill, printAllSplits, isPrinting]);

    if (isPrinting) {
        const billsToPrint = printAllSplits ? orderDetail.split_bills : [targetPrintBill || { isMain: true }];

        return (
            <div className="bg-white print-section" style={{ color: '#000' }}>
                <style>{`
                    @media print {
                        @page { margin: 10mm; size: auto; }
                        body { background: white !important; margin: 0; }
                        .no-print { display: none !important; }
                        .print-section { 
                            width: 100% !important; 
                            margin: 0 !important; 
                            padding: 0 !important;
                            display: block !important;
                        }
                        .bill-item-row {
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }
                        .bill-container {
                            display: block !important;
                            page-break-after: always !important;
                            break-after: page !important;
                            margin-bottom: 0 !important;
                        }
                        /* Fix for bootstrap tables in print */
                        .table {
                            border-collapse: collapse !important;
                        }
                        .table td, .table th {
                            background-color: #fff !important;
                        }
                    }
                `}</style>
                {billsToPrint.map((bill, bIdx) => {
                    const isSplitBill = !bill.isMain;
                    const payerName = isSplitBill
                        ? bill.user_name
                        : (orderDetail.guest_name || `${orderDetail.first_name || ''} ${orderDetail.last_name || ''}`);

                    const printTitle = isSplitBill ? "HÓA ĐƠN THANH TOÁN (shared)" : "HÓA ĐƠN THANH TOÁN";
                    const statusLabel = (isSplitBill ? bill.is_payment : orderDetail.is_payment) ? "Đã Thanh Toán:" : "Khách Phải Thanh Toán:";

                    return (
                        <div key={bIdx} className="p-4 bg-white bill-container" style={{
                            borderBottom: bIdx < billsToPrint.length - 1 ? '3px dashed #ccc' : 'none',
                        }}>
                            <div className="text-center mb-4 border-bottom pb-3">
                                <h2 className="fw-bold text-uppercase mb-1" style={{ color: '#2c3e50' }}>Healthy Food Restaurant</h2>
                                <p className="text-muted mb-0">Địa chỉ: 123 Đường Ẩm Thực, Quận 1, TP. HCM</p>
                                <p className="text-muted mb-0">Hotline: 0909 123 456</p>
                                <h4 className="mt-3 fw-bold text-dark text-uppercase">{printTitle}</h4>
                                <p className="text-muted mb-0">Hóa đơn #: {orderDetail.id}</p>
                                <p className="text-muted mb-0 fw-bold mt-1">Người thanh toán: {payerName}</p>
                                {orderDetail.table_number && (
                                    <p className="text-muted mb-0">Bàn số: {orderDetail.table_number}</p>
                                )}
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
                                    {isSplitBill ? (
                                        bill.split_type === 'item' ? (
                                            bill.items && bill.items.map((it, idx) => (
                                                <tr key={idx} className="bill-item-row">
                                                    <td className="text-start fw-bold text-dark">{it.product_name}</td>
                                                    <td className="text-center fw-bold">{it.qty}</td>
                                                    <td className="text-muted">{(it.unit_price || it.price)?.toLocaleString()} đ</td>
                                                    <td className="fw-bold text-dark">{(it.total_price || (it.price * it.qty) || 0).toLocaleString()} đ</td>
                                                </tr>
                                            ))
                                        ) : (
                                            orderItems && orderItems.map((it, idx) => (
                                                <tr key={idx} className="bill-item-row">
                                                    <td className="text-start fw-bold text-dark">{it.product_name || it.name}</td>
                                                    <td className="text-center fw-bold">{it.qty}</td>
                                                    <td className="text-muted">{(it.unit_price || it.price)?.toLocaleString()} đ</td>
                                                    <td className="fw-bold text-dark">{(it.total_price || (it.price * it.qty) || 0).toLocaleString()} đ</td>
                                                </tr>
                                            ))
                                        )
                                    ) : (
                                        orderItems && orderItems.filter(it => it.status === 'SERVED').map((it, idx) => (
                                            <tr key={idx} className="bill-item-row">
                                                <td className="text-start fw-bold text-dark">{it.product_name || it.name}</td>
                                                <td className="text-center fw-bold">{it.qty}</td>
                                                <td className="text-muted">{(it.unit_price || it.price)?.toLocaleString()} đ</td>
                                                <td className="fw-bold text-dark">{(it.total_price || (it.price * it.qty) || 0).toLocaleString()} đ</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>

                            {isSplitBill && bill.split_type !== 'item' && (
                                <div className="d-flex justify-content-between w-100 mt-2 align-items-center mb-1">
                                    <span className="text-muted">Tổng bill gốc:</span>
                                    <span className="fw-bold fs-6">{(orderDetail?.total_price || 0).toLocaleString()} đ</span>
                                </div>
                            )}

                            {isSplitBill && bill.split_type !== 'item' && (
                                <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                                    <span className="text-muted fst-italic">Phần share bill ({bill.split_type === 'even' ? `Chia đều ${orderDetail.split_bills.length}` : `Tỷ lệ ${bill.percent}%`}):</span>
                                    <span className="fw-bold text-primary">{(bill.percent || (100 / orderDetail.split_bills.length)).toFixed(1)}%</span>
                                </div>
                            )}

                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                    <h2 className="mb-0 fw-bold text-dark">Chi tiết đơn hàng</h2>
                                    {orderDetail && (
                                        <span className={`ms-3 admin-badge ${
                                            orderDetail.is_payment ? 'admin-badge--success' :
                                            (orderStatus === statusOrder.CANCELED ? 'admin-badge--danger' : 
                                            (orderStatus === statusOrder.NEW ? 'admin-badge--default' : 
                                            (orderDetail.needs_support || orderItems.some(i => ['NEW', 'PREPARING'].includes(i.status)) ? 'admin-badge--warning' : 'admin-badge--info')))
                                        }`}>
                                            {orderDetail.is_payment ? 'Hoàn thành' : 
                                            (orderStatus === statusOrder.CANCELED ? 'Đã hủy' : 
                                            (orderStatus === statusOrder.NEW ? 'Đơn mới' : 
                                            (orderDetail.needs_support || orderItems.some(i => ['NEW', 'PREPARING'].includes(i.status)) ? 'Chờ xử lý' : 'Đã phục vụ')))}
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-danger fw-bold mb-0">
                                    {isSplitBill ? bill.amount?.toLocaleString() : orderDetail.total_price?.toLocaleString()} đ
                                </h4>
                            </div>
                            <div className="text-center mt-3 pt-2">
                                <p className="fst-italic text-muted" style={{ fontSize: '13px' }}>Cảm ơn và hẹn gặp lại!</p>
                            </div>
                        </div>
                    );
                })}
                <div className="mt-4 text-center no-print pb-5">
                    <button className="btn btn-sm btn-primary" onClick={() => { setPrintSplitBill(null); setPrintMainBill(false); setPrintAllSplits(false); }}>Thoát Chế Độ In</button>
                </div>
            </div>
        );
    }

    const handleShareToMessenger = () => {
        if (!orderDetail) return;
        const event = new CustomEvent('shareOrderToChat', { detail: orderDetail });
        window.dispatchEvent(event);
    }

    const handleExportPDF = (format = 'RECEIPT') => {
        if (format === 'RECEIPT') {
            if (orderDetail?.split_bills?.length > 0) {
                setPrintAllSplits(true);
            } else {
                setPrintMainBill(true);
            }
            return;
        }

        // A4 format logic...

        // For A4, we still use the screen DOM but with original logic
        const element = document.querySelector('.order__detail-container');
        if (!element) return;

        const noPrintElements = element.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');

        const toastId = toast.loading("Đang xuất file PDF A4...", { autoClose: false });

        const opt = {
            margin: 10,
            filename: `HoaDon_A4_${orderDetail?.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).outputPdf('bloburl').then((pdfUrl) => {
            toast.update(toastId, { render: "Đã xuất PDF A4!", type: "success", isLoading: false, autoClose: 3000 });
            window.open(pdfUrl, '_blank');
        }).finally(() => {
            noPrintElements.forEach(el => el.style.display = '');
        });
    };

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
                            <div className="mt-3 text-secondary" style={{ fontSize: '12px' }}>
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
                                <div className="mt-3 text-secondary" style={{ fontSize: '12px' }}>
                                    Ngân hàng Quân Đội (MB Bank)
                                </div>
                            </div>

                            <div className="d-flex justify-content-center gap-3 mt-3">
                                <button className="btn btn-outline-secondary" onClick={() => { setMainQrData(null); setIsZoomed(false); }}>Đóng</button>
                                <button className="btn btn-success fw-bold" onClick={() => {
                                    if (mainQrData.isSplit) {
                                        processSplitPayment(mainQrData.splitId, 'manual_transfer');
                                    } else {
                                        handlePayment(orderDetail.id, 'chuyển khoản');
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
                        {/* <button className="btn btn-primary d-flex align-items-center shadow-sm text-white fw-bold" onClick={handleShareToMessenger}>
                            Messenger
                        </button> */}
                        {/* <button className="btn border border-secondary bg-white text-dark d-flex align-items-center shadow-sm" onClick={() => handleExportPDF('A4')}>
                           Khổ A4
                        </button> */}
                        <button className="btn btn-dark d-flex align-items-center shadow-sm fw-bold" onClick={() => handleExportPDF('RECEIPT')}>
                            <i className="fa fa-print me-2"></i> K80 (Máy POS)
                        </button>
                    </div>
                </div>

                <div className="order__detail-container background-radius shadow-sm bg-white print-section">
                    <div className="text-center mb-4 border-bottom pb-3">
                        <h2 className="fw-bold text-uppercase mb-1" style={{ color: '#2c3e50' }}>Healthy Food Restaurant</h2>
                        <p className="text-muted mb-0">Địa chỉ: 123 Đường Ẩm Thực, Quận 1, TP. HCM</p>
                        <p className="text-muted mb-0">Hotline: 0909 123 456</p>
                        <h4 className="mt-3 fw-bold text-dark text-uppercase">
                            {orderDetail && (orderDetail.is_payment ? "Hóa Đơn Thanh Toán" : (orderDetail.status === statusOrder.CANCELED ? "Phiếu mua hàng (Đã hủy)" : "Phiếu mua hàng (Tạm tính)"))}
                        </h4>
                        <p className="text-muted mb-0">
                            {orderDetail && orderDetail.is_payment ? "Hóa đơn #" : "Phiếu mua hàng #"}: {orderDetail && orderDetail.id}
                        </p>
                    </div>

                    <div className="order__detail-head border p-3 rounded bg-light mb-4 d-flex justify-content-between align-items-center flex-wrap">
                        <div className="d-flex align-items-center gap-4">
                            <div>
                                <span className="text-muted me-1">Tên khách hàng:</span>
                                <span className="fw-bold fs-5">{orderDetail && orderDetail.guest_name ? orderDetail.guest_name : `${orderDetail && orderDetail.first_name} ${orderDetail && orderDetail.last_name}`}</span>
                            </div>
                            {orderDetail && orderDetail.table_number && (
                                <div className="text-primary fw-bold fs-5" style={{ borderLeft: '2px solid #ccc', paddingLeft: '20px' }}>
                                    Bàn số: {orderDetail.table_number}
                                </div>
                            )}
                        </div>
                        <div>
                            <span className="text-muted me-1">Ngày đặt hàng:</span>
                            <span className="fw-bold fs-6">{orderDetail && moment(orderDetail.createdAt).format('DD/MM/YYYY')}</span>
                        </div>
                    </div>

                    {orderDetail && orderDetail.needs_support && (
                        <div className="alert alert-warning d-flex justify-content-between align-items-center mb-4 shadow-sm no-print">
                            <div className="d-flex align-items-center">
                                <i className="fa-solid fa-bell-concierge fa-fade me-3 fs-4"></i>
                                <div>
                                    <h6 className="mb-0 fw-bold">Khách hàng cần hỗ trợ!</h6>
                                    <small>Vui lòng kiểm tra và phản hồi lại cho khách.</small>
                                </div>
                            </div>
                            <button className="btn btn-sm btn-dark fw-bold px-3" onClick={handleResetSupport}>Đã hỗ trợ xong</button>
                        </div>
                    )}

                    <div className="order__detail-group mt-3 d-flex flex-wrap" style={{ gap: '1rem' }}>
                        {/* Cột Trái: Slip List - Hide if Paid */}
                        {!(orderDetail && orderDetail.is_payment) && (
                            <div className="slip-section" style={{ flex: `0 0 calc(${leftColPercent}% - 0.5rem)`, maxWidth: `calc(${leftColPercent}% - 0.5rem)` }}>
                                <div className="border rounded bg-white shadow-sm h-100 no-print">
                                    <h5 className="p-3 bg-dark text-white rounded-top mb-0 fst-italic">Phiếu đặt món</h5>
                                    <div className="p-2">
                                        {Object.keys(slipBatches).length > 0 ? (
                                            Object.keys(slipBatches).map((batchKey, i) => (
                                                <div key={i} className="mb-3 border p-2 rounded bg-light">
                                                    <div className="d-flex justify-content-between align-items-center bg-light p-2 mb-2 border-bottom">
                                                        <h6 className="text-secondary fw-bold mb-0">
                                                            {batchKey}
                                                        </h6>
                                                        {slipBatches[batchKey].some(item => item.status === 'NEW' || !item.status) && (
                                                            <button
                                                                className="btn btn-sm btn-warning fw-bold"
                                                                onClick={async () => {
                                                                    const newItems = slipBatches[batchKey].filter(item => item.status === 'NEW' || !item.status);
                                                                    for (const item of newItems) {
                                                                        await handleUpdateItemStatus(item._id || item.id, 'PREPARING');
                                                                    }
                                                                    toast.success('Đã nhận toàn bộ phiếu!');
                                                                }}
                                                            >
                                                                Nhận đơn
                                                            </button>
                                                        )}
                                                    </div>
                                                    {slipBatches[batchKey].map((item, index) => (
                                                        <div key={index} className="d-flex justify-content-between align-items-center bg-white p-2 mb-2 shadow-sm rounded border-start border-4 border-warning">
                                                            <div className="w-50">
                                                                <div className="fw-bold">{item.product_name} <span className="text-primary">(x{item.qty})</span></div>
                                                                <div className="text-muted" style={{ fontSize: '12px' }}>Trạng thái: <span className={item.status === 'PREPARING' ? 'text-warning fw-bold' : 'text-danger fw-bold'}>{item.status || 'NEW'}</span></div>
                                                            </div>
                                                            <div className="d-flex flex-column gap-1 w-50">
                                                                {item.status === 'PREPARING' && orderDetail.status !== statusOrder.CANCELED && (
                                                                    <button className="btn btn-sm btn-success w-100 fw-bold" onClick={() => handleUpdateItemStatus(item._id || item.id, 'SERVED')}>
                                                                        Đã Phục Vụ
                                                                    </button>
                                                                )}
                                                                {orderDetail.status !== statusOrder.CANCELED && (
                                                                    <button className="btn btn-sm btn-outline-danger w-100 fw-bold mt-1" onClick={() => {
                                                                        if (window.confirm('Xác nhận hủy món này do sự cố quy trình? (Tiền sẽ được trừ vào tổng đơn)')) {
                                                                            handleUpdateItemStatus(item._id || item.id, 'CANCELED');
                                                                        }
                                                                    }}>
                                                                        Xóa do sự cố
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center p-4 text-muted fst-italic">Không có món nào đang chuẩn bị</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cột Phải: Receipt - Full width if Paid */}
                        <div style={{
                            flex: orderDetail && orderDetail.is_payment ? '0 0 100%' : `0 0 calc(${rightColPercent}% - 0.5rem)`,
                            maxWidth: orderDetail && orderDetail.is_payment ? '100%' : `calc(${rightColPercent}% - 0.5rem)`
                        }}>
                            <div className="border rounded bg-white shadow-sm h-70 print-section">
                                <h5 className="p-3 bg-success text-white rounded-top mb-0 fst-italic">
                                    {orderDetail && orderDetail.is_payment ? "Món Đã Thanh Toán" : "Món Đã Phục Vụ"}
                                </h5>
                                <div className="p-0">
                                    {(() => {
                                        const servedItems = receiptItems; // Already filtered above

                                        // Grouping logic based on batch_num
                                        const batchMap = {};
                                        servedItems.forEach(item => {
                                            const bNum = item.batch_num || 1;
                                            if (!batchMap[bNum]) {
                                                batchMap[bNum] = {
                                                    startTime: item.served_at ? new Date(item.served_at) : null,
                                                    items: []
                                                };
                                            }
                                            batchMap[bNum].items.push(item);
                                            // Optional: Keep the earliest served time for the batch display
                                            if (item.served_at) {
                                                const iTime = new Date(item.served_at);
                                                if (!batchMap[bNum].startTime || iTime < batchMap[bNum].startTime) {
                                                    batchMap[bNum].startTime = iTime;
                                                }
                                            }
                                        });

                                        const sessions = Object.keys(batchMap)
                                            .sort((a, b) => Number(a) - Number(b))
                                            .map(bNum => ({
                                                batchNum: bNum,
                                                ...batchMap[bNum]
                                            }));

                                        return (
                                            <>
                                                {sessions.length > 0 ? (
                                                    sessions.map((session, sIdx) => (
                                                        <div key={sIdx} className="mb-4">
                                                            <div className="bg-light p-2 border-start border-4 border-success d-flex justify-content-between align-items-center">
                                                                <span className="fw-bold text-success text-uppercase" style={{ fontSize: '13px' }}>Đợt phục vụ {sIdx + 1}</span>
                                                                <span className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                                                    {session.startTime ? moment(session.startTime).format('HH:mm') : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <Table striped hover size="sm" className="text-end align-middle mb-0 table-borderless">
                                                                <tbody>
                                                                    {session.items.map((item, index) => (
                                                                        <tr key={index}>
                                                                            <td className="text-start ps-3 fw-bold text-dark" style={{ width: '60%' }}>{item.product_name}</td>
                                                                            <td className="text-center fw-bold text-primary" style={{ width: '10%' }}>x{item.qty}</td>
                                                                            <td className="fw-bold text-dark text-end pe-3" style={{ width: '30%' }}>{(item.price * item.qty).toLocaleString()}đ</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </Table>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center p-4 text-muted fst-italic">Chưa có món nào được phục vụ</div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {canceledItems.length > 0 && (
                        <div className="order__detail-group mt-4 border rounded bg-white shadow-sm overflow-hidden canceled-section no-print">
                            <h5 className="p-3 bg-danger text-white mb-0 fst-italic">Món Đã Hủy</h5>
                            <div className="p-0">
                                <Table striped hover size="sm" className="text-end align-middle mb-0 table-borderless">
                                    {/* <thead className="table-light">
                                        <tr style={{ fontSize: '13px' }}>
                                            <th className="text-start ps-3" style={{ width: '60%' }}>Tên món</th>
                                            <th className="text-center" style={{ width: '10%' }}>SL</th>
                                            <th className="text-end pe-3" style={{ width: '30%' }}>Nguyên giá</th>
                                        </tr>
                                    </thead> */}
                                    <tbody>
                                        {canceledItems.map((item, index) => (
                                            <tr key={index} className="text-muted">
                                                <td className="text-start ps-3 fw-bold">{item.product_name}</td>
                                                <td className="text-center">x{item.qty}</td>
                                                <td className="text-end pe-3 fw-bold">{(item.price * item.qty).toLocaleString()}đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                <div className="p-2 bg-light text-end pe-3">
                                    <small className="text-danger fst-italic">* Các món này đã được trừ khỏi tổng hóa đơn</small>
                                </div>
                            </div>
                        </div>
                    )}

                    {orderDetail && orderDetail.split_bills && orderDetail.split_bills.length > 0 && (
                        <div className="order__detail-group mt-4 p-3 border rounded border-warning">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="text-warning font-bold mb-0">Thông tin Chia Bill</h5>
                                {!orderDetail.is_payment && !orderDetail.split_bills.some(sb => sb.is_payment) && (
                                    <button className="btn btn-sm btn-outline-warning fw-bold d-flex align-items-center" onClick={() => setShowSplit(true)}>
                                        <span className="me-1"></span> Chỉnh sửa
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
                                        <tr key={sbIdx} className={sb.is_payment ? "table-light" : ""}>
                                            <td className="fw-bold align-middle">
                                                {sb.user_name} <br />
                                                <small className="text-muted">({sb.percent}%)</small>
                                            </td>
                                            <td className="text-danger fw-bold align-middle text-center">{sb.amount.toLocaleString()} đ</td>
                                            <td className="text-start align-middle" style={{ fontSize: '12px' }}>
                                                {sb.items && sb.items.map((it, idx) => (
                                                    <div key={idx} className="text-truncate" style={{ maxWidth: '150px' }}>• {it.product_name} x {it.qty}</div>
                                                ))}
                                                {(!sb.items || sb.items.length === 0) && <span className="text-muted fst-italic">Không áp dụng món</span>}
                                            </td>
                                            <td className="align-middle text-center">
                                                {sb.is_payment ? (
                                                    <span className="badge bg-success px-3 py-2">
                                                        <i className="fa-solid fa-check-circle me-1"></i>
                                                        {sb.payment_method === 'tiền mặt' ? 'Đã trả tiền mặt' : 'Đã chuyển khoản'}
                                                    </span>
                                                ) : (
                                                    <div className="py-2 text-center">
                                                        <span className="badge bg-warning text-dark px-3 py-2">Chưa thanh toán</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="align-middle">
                                                <div className="d-flex justify-content-center align-items-center gap-2">
                                                    {!sb.is_payment ? (
                                                        <>
                                                            <Form.Select
                                                                size="sm"
                                                                className="w-auto border-primary text-primary fw-bold"
                                                                value={splitPaymentMethods[sb.split_id] || 'transfer'}
                                                                onChange={(e) => setSplitPaymentMethods({ ...splitPaymentMethods, [sb.split_id]: e.target.value })}
                                                            >
                                                                <option value="transfer">Chuyển khoản</option>
                                                                <option value="tiền mặt">Tiền mặt</option>
                                                            </Form.Select>
                                                            <button className="btn btn-sm btn-primary fw-bold" onClick={() => handleSplitPayment(sb.split_id)}>
                                                                Thu tiền
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-sm btn-dark text-white fw-bold shadow-sm px-3" onClick={() => setPrintSplitBill(sb.split_id)}>
                                                            <i className="fa-solid fa-print me-2"></i> In lại hóa đơn
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {orderDetail && orderStatus !== statusOrder.CANCELED && (
                        <div className="order__detail-foot mt-4 pb-3 border-bottom-0">
                            <div className="order__detail-status bg-light p-4 rounded w-100 d-flex flex-column align-items-end">
                                <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                                    <span className="text-muted">Trạng thái thanh toán:</span>
                                    <span className={`badge ${orderDetail && orderDetail.is_payment ? 'bg-success' : (orderDetail && orderDetail.split_bills?.some(sb => sb.is_payment) ? 'bg-warning text-dark' : 'bg-danger')} fs-6`}>
                                        {orderDetail && orderDetail.is_payment ? 'Đã thanh toán đủ' : (orderDetail && orderDetail.split_bills?.some(sb => sb.is_payment) ? 'Thanh toán 1 phần' : 'Chưa thu đủ')}
                                    </span>
                                </div>
                                {orderDetail && orderDetail.is_payment && (!orderDetail.split_bills || orderDetail.split_bills.length === 0) && (
                                    <div className="d-flex justify-content-between w-100 mb-2 border-bottom pb-2">
                                        <span className="text-muted">Hình thức thanh toán:</span>
                                        <span className="fw-bold text-primary">
                                            {orderDetail.payment_method === 'chuyển khoản' ? 'Chuyển khoản' : 'Tiền mặt'}
                                        </span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between w-100 mt-2 align-items-center">
                                    <span className="fw-bold fs-5 text-dark">
                                        {orderDetail && orderDetail.is_payment ? 'Đã Thu (Tổng cộng):' : 'Tổng Cần Thu (Số dư nợ):'}
                                    </span>
                                    <h2 className="text-danger fw-bold mb-0">
                                        {orderDetail && (
                                            orderDetail.is_payment
                                                ? orderDetail.total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })
                                                : (orderDetail.total_price - (orderDetail.split_bills?.filter(sb => sb.is_payment).reduce((acc, curr) => acc + curr.amount, 0) || 0)).toLocaleString('vi', { style: 'currency', currency: 'VND' })
                                        )}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    )}

                    {orderDetail && orderStatus !== statusOrder.CANCELED && (
                        <div className="order__detail-group-btn mt-3 no-print d-flex justify-content-end bg-light p-3 rounded">
                            {/* {order-level status buttons removed} */}

                            <button hidden={orderDetail && (orderDetail.is_payment || (orderDetail.split_bills && orderDetail.split_bills.length > 0))} className="btn btn-payment"
                                onClick={() => handlePayment(orderDetail && orderDetail.id, 'tiền mặt')}>Đã thanh toán</button>

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

                            {orderDetail && orderDetail.split_bills && orderDetail.split_bills.length > 0 && !orderDetail.split_bills.some(sb => sb.is_payment) && (
                                <button className="btn btn-danger ms-2 text-white font-bold px-3 py-2" onClick={handleUndoSplit}>
                                    Hủy chia bill
                                </button>
                            )}
                        </div>
                    )}
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
