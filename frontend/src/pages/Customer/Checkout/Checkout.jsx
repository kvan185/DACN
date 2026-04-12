import React, { useEffect, useState } from 'react';
import { Container, Form, Table, Modal, Button, Spinner } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import Cart from '../../../components/Customer/Cart/Cart';
import PopupOrderSuccess from '../../../components/Customer/PopupOrderSuccess/PopupOrderSuccess';
import { fetchGetCart } from '../../../actions/cart';
import { setCartItems, setCartStore } from '../../../actions/user';
import { 
    fetchOrder, fetchPayment, fetchUpdateIsPayment, fetchGuestOrder, 
    fetchGuestPayment, fetchPayGuestOrdersByTable, fetchTablePayment,
    fetchCallStaff, fetchCreateSplitPayment 
} from '../../../actions/order';
import SplitBillModal from '../../../components/SplitBillModal';
import { socket } from '../../../socket';
import './checkout.scss';

function Checkout(props) {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [showSplit, setShowSplit] = useState(false);
    const [splitOrderPayload, setSplitOrderPayload] = useState(null);
    const [splitSuccessData, setSplitSuccessData] = useState(null);
    const [mainOrderQr, setMainOrderQr] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [splitPaymentLinks, setSplitPaymentLinks] = useState({});
    const [isCallingStaff, setIsCallingStaff] = useState(false);
    const [orderSource, setOrderSource] = useState('online');
    const [tableNumber, setTableNumber] = useState(null);
    const accessToken = sessionStorage.getItem("accessToken");
    const cart = useSelector(state => state.user.cart);
    const allCartItems = useSelector(state => state.user.cartItems);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const selectedItemIds = location.state?.selectedItems || [];
    const guestItemsFromState = location.state?.guestItems || [];
    const isFullTablePayment = location.state?.isFullTablePayment || false;
    const passedOrderSource = location.state?.orderSource;

    const cartItems = isFullTablePayment
        ? guestItemsFromState
        : (allCartItems.filter(item => selectedItemIds.includes(item.id)));

    const cartTotalPrice = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    useEffect(() => {
        const savedOrderSource = localStorage.getItem('orderSource');
        if (accessToken) {
            const getItemsCart = async () => {
                const response = await fetchGetCart(accessToken);
                const data = await response.json();

                if (data) {
                    const cartAction = setCartStore(data.cart);
                    const cartItemsAction = setCartItems(data.cartItems);
                    dispatch(cartAction);
                    dispatch(cartItemsAction);
                }
            }
            getItemsCart();
        } else if (savedOrderSource === 'table') {
            const guestItems = JSON.parse(localStorage.getItem('guestCart')) || [];
            dispatch(setCartItems(guestItems));
            dispatch(setCartStore({
                id: 'guest',
                total_item: guestItems.reduce((sum, i) => sum + i.qty, 0),
                total_price: guestItems.reduce((sum, i) => sum + i.total_price, 0)
            }));
        }
    }, [accessToken]);

    useEffect(() => {
        // Khôi phục trạng thái orderSource và tableNumber
        let finalOrderSource = 'online';
        if (passedOrderSource) {
            finalOrderSource = passedOrderSource;
            setOrderSource(passedOrderSource);
            if (passedOrderSource === 'table') {
                const savedTableNumber = localStorage.getItem('tableNumber');
                if (savedTableNumber) {
                    setTableNumber(savedTableNumber);
                }
            }
        } else {
            const savedOrderSource = localStorage.getItem('orderSource');
            const savedTableNumber = localStorage.getItem('tableNumber');

            if (savedOrderSource) {
                finalOrderSource = savedOrderSource;
                setOrderSource(savedOrderSource);
                if (savedOrderSource === 'table' && savedTableNumber) {
                    setTableNumber(savedTableNumber);
                }
            }
        }

        if (finalOrderSource === 'table') {
            setPaymentMethod('transfer');
        }
    }, [passedOrderSource]);

    const handleSelectPayment = (event) => {
        const paymentMethodValue = event.target.value;
        setPaymentMethod(paymentMethodValue);
    }

    const handleOrder = async (event) => {
        event.preventDefault();
        const cartId = cart ? cart.id : null;

        if (paymentMethod === '') {
            toast.error('Vui lòng chọn phương thức thanh toán');
            return;
        }

        if (!isFullTablePayment && cartId === null) {
            toast.error('Gặp lỗi khi truy xuất giỏ hàng. Vui lòng thử lại!');
            return;
        }

        if (cartItems.length === 0) {
            toast.error('Không có sản phẩm nào được chọn để thanh toán');
            return;
        }

        if (paymentMethod === 'cash') {
            let data;
            if (isFullTablePayment) {
                // Đối với thanh toán tại bàn bằng tiền mặt, cập nhật phương thức nhưng chưa is_payment
                data = await fetchPayGuestOrdersByTable(tableNumber, 'tiền mặt');
            } else if (accessToken) {
                data = await fetchOrder(cartId, orderSource, tableNumber, selectedItemIds, 'tiền mặt');
            } else {
                const guestItemsToOrder = allCartItems.filter(item => selectedItemIds.includes(item.id));
                data = await fetchGuestOrder(guestItemsToOrder, tableNumber, orderSource, 'tiền mặt');
            }

            if (data && data.success) {
                if (orderSource === 'table') {
                    localStorage.removeItem('guestCart');
                    localStorage.removeItem('guestHasOrdered');
                    // Clear redux state cho khách tiếp theo
                    dispatch(setCartItems([]));
                    dispatch(setCartStore({
                        id: 'guest',
                        total_item: 0,
                        total_price: 0
                    }));
                }
                return setShowPopup(true);
            } else {
                toast.error(data?.message || 'Có lỗi xảy ra khi xử lý đơn hàng');
            }
        } else {
            // Transfer
            let data;
            if (isFullTablePayment) {
                data = await fetchTablePayment(tableNumber);
            } else if (accessToken) {
                data = await fetchPayment(cartId, selectedItemIds);
            } else {
                const guestItemsToOrder = allCartItems.filter(item => selectedItemIds.includes(item.id));
                data = await fetchGuestPayment(guestItemsToOrder, tableNumber, orderSource);
            }

            if (data && data.paymentUrl) {
                // Thay vì chuyển hướng, hiển thị QR trực tiếp
                setMainOrderQr({
                    qrCode: data.qrCode || data.paymentUrl,
                    orderCode: data.orderCode,
                    amount: cartTotalPrice
                });
            } else {
                toast.error(data?.message || 'Không thể khởi tạo thanh toán');
            }
        }
    }

    const handleOpenSplit = async (e) => {
        e.preventDefault();

        const cartId = cart ? cart.id : null;

        if (cartItems.length === 0) {
            toast.error('Không có sản phẩm nào được chọn để chia hóa đơn');
            return;
        }

        let data;
        // CREATE ORDER FIRST with dummy payment method 'chia bill' (handled as 'tiền mặt' internally for creation)
        if (isFullTablePayment) {
            setSplitOrderPayload({ id: 'TABLE_' + tableNumber, total_price: cartTotalPrice, items: [...cartItems] });
            setShowSplit(true);
            return;
        } else if (accessToken) {
            data = await fetchOrder(cartId, orderSource, tableNumber, selectedItemIds, 'chờ chia bill');
        } else {
            const guestItemsToOrder = allCartItems.filter(item => selectedItemIds.includes(item.id));
            data = await fetchGuestOrder(guestItemsToOrder, tableNumber, orderSource, 'chờ chia bill');
        }

        if (data && data.success) {
            if (orderSource === 'table') {
                localStorage.removeItem('guestCart');
                localStorage.removeItem('guestHasOrdered');
                dispatch(setCartItems([]));
                dispatch(setCartStore({ id: 'guest', total_item: 0, total_price: 0 }));
            }
            // Pass the newly created actual order ID to SplitBillModal
            setSplitOrderPayload({ id: data.orderId || data.data?._id || data.order?.id, total_price: cartTotalPrice, items: [...cartItems] });
            setShowSplit(true);
        } else {
            toast.error(data?.message || 'Có lỗi khi tạo hóa đơn để chia bill');
        }
    }

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const cancel = urlParams.get('cancel');
        const orderCode = urlParams.get('orderCode');

        if (code === '00' && cancel === 'false' && orderCode) {
            const finalizePayment = async () => {
                // Trạng thái đơn hàng sẽ được Backend xử lý thông qua Webhook PayOS tự động
                const savedOrderSource = localStorage.getItem('orderSource');
                const savedTableNumber = localStorage.getItem('tableNumber');

                if (savedOrderSource === 'table') {
                    localStorage.removeItem('guestCart');
                    localStorage.removeItem('guestHasOrdered');

                    // Clear redux state cho khách tiếp theo
                    dispatch(setCartItems([]));
                    dispatch(setCartStore({
                        id: 'guest',
                        total_item: 0,
                        total_price: 0
                    }));

                    // Chuyển hướng thẳng về trang thực đơn ban đầu
                    navigate(`/menu?table=${savedTableNumber}`, {
                        replace: true
                    });
                } else {
                    setShowPopup(true);
                }
            };

            finalizePayment();
        } else if (cancel === 'true' || (code && code !== '00')) {
            toast.error('Thanh toán không thành công / Đã hủy');
        }
    }, [navigate]);

    useEffect(() => {
        if (splitSuccessData && splitSuccessData.length > 0) {
            if (splitSuccessData.length > 3) {
                // Tự động gọi nhân viên
                handleCallStaff("Khách hàng chia bill > 3 phần, cần hỗ trợ xử lý thủ công.");
            } else {
                // Tự động lấy link PayOS cho tối đa 3 phần
                const fetchLinks = async () => {
                    const links = {};
                    for (const sb of splitSuccessData) {
                        try {
                            const res = await fetchCreateSplitPayment(splitOrderPayload.id, sb.split_id, 'transfer');
                            if (res.success && res.qrCode) {
                                links[sb.split_id] = res.qrCode;
                            }
                        } catch (e) {
                            console.error("Lỗi lấy link thanh toán cho split:", sb.split_id, e);
                        }
                    }
                    setSplitPaymentLinks(links);
                };
                fetchLinks();
            }
        }
    }, [splitSuccessData]);

    useEffect(() => {
        // Lắng nghe sự kiện thanh toán thành công từ Socket.io
        socket.on('paymentSuccess', (data) => {
            if (mainOrderQr && data.orderCode === mainOrderQr.orderCode) {
                setMainOrderQr(null);
                setShowPopup(true);
                toast.success("Thanh toán thành công!");
                
                // Thu dọn giỏ hàng nếu cần
                if (orderSource === 'table') {
                    localStorage.removeItem('guestCart');
                    localStorage.removeItem('guestHasOrdered');
                    dispatch(setCartItems([]));
                    dispatch(setCartStore({ id: 'guest', total_item: 0, total_price: 0 }));
                }
            }
        });

        return () => {
            socket.off('paymentSuccess');
        };
    }, [mainOrderQr, orderSource]);

    const handleCallStaff = async (customMessage = null) => {
        setIsCallingStaff(true);
        try {
            const savedTableNumber = tableNumber || localStorage.getItem('tableNumber');
            const res = await fetchCallStaff(savedTableNumber, customMessage, splitOrderPayload?.id);
            if (res.success) {
                toast.success("Đã gửi yêu cầu hỗ trợ tới nhân viên.");
            } else {
                toast.error("Không thể gửi yêu cầu hỗ trợ. Vui lòng thử lại!");
            }
        } catch (e) {
            toast.error("Lỗi kết nối khi gọi nhân viên.");
        } finally {
            setIsCallingStaff(false);
        }
    };

    const currentOrderSource = passedOrderSource || localStorage.getItem('orderSource') || orderSource;
    if (!accessToken && currentOrderSource !== 'table' && !isFullTablePayment) {
        navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
    }

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1000}
            />

            <Cart accessToken={accessToken} />
            <PopupOrderSuccess
                show={showPopup}
                backdrop="static"
                isPayment={isFullTablePayment || (orderSource === 'table')}
                tableNumber={tableNumber}
            />

            {splitSuccessData ? (
                <Container className="pt-4 pb-5">
                    <div className="checkout shadow p-4 border bg-white rounded mt-4 mx-auto" style={{ maxWidth: splitSuccessData.length <= 3 ? '1200px' : '600px' }}>
                        <div className="text-center mb-4">
                            <h2 className="text-success fw-bold">Tách hóa đơn thành công!</h2>
                            {splitSuccessData.length > 3 ? (
                                <div className="alert alert-warning py-3 mt-3 shadow-sm border-warning">
                                    <h4 className="alert-heading fw-bold">⚠️ Cần nhân viên hỗ trợ</h4>
                                    <p className="mb-0 fs-5">
                                        Vì hóa đơn được chia thành <strong>{splitSuccessData.length}</strong> phần (nhiều hơn 3), 
                                        hệ thống đã tự động gửi yêu cầu hỗ trợ. Quý khách vui lòng đợi nhân viên đến hỗ trợ thanh toán trực tiếp.
                                    </p>
                                </div>
                            ) : (
                                <h5 className="text-muted fst-italic">
                                    Quý khách có thể tự quét mã QR bên dưới để thanh toán nhanh hoặc gọi nhân viên hỗ trợ.
                                </h5>
                            )}
                        </div>

                        {splitSuccessData.length <= 3 && (
                            <div className="row mt-4 justify-content-center">
                                {splitSuccessData.map((sb, idx) => (
                                    <div key={idx} className="col-md-4 mb-4">
                                        <div className="vietqr-card" style={{ padding: '16px' }}>
                                            <div className="card-header-branding" style={{ marginBottom: '12px' }}>
                                                <img src="/logos/vietqr_logo.png" alt="VietQR" style={{ height: '25px' }} />
                                                <img src="/logos/mb_logo.png" alt="MB Bank" style={{ height: '18px' }} />
                                            </div>
                                            
                                            <div className="text-center mb-2 fw-bold text-primary">{sb.user_name}</div>

                                            <div className="qr-main-container" style={{ padding: '12px', marginBottom: '12px' }}>
                                                {splitPaymentLinks[sb.split_id] ? (
                                                    <QRCodeSVG 
                                                        value={splitPaymentLinks[sb.split_id]} 
                                                        size={140} 
                                                        level="H"
                                                        imageSettings={{
                                                            src: "/logos/mb_logo.png",
                                                            x: undefined,
                                                            y: undefined,
                                                            height: 28,
                                                            width: 28,
                                                            excavate: true,
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="d-flex align-items-center justify-content-center" style={{ width: 140, height: 140 }}>
                                                        <div className="spinner-border text-primary" role="status"></div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="card-footer-info">
                                                <div className="account-name" style={{fontSize: '10px'}}>Người nhận: VN</div>
                                                <div className="user-fullname" style={{fontSize: '14px', marginBottom: '8px'}}>NGUYỄN KHÁNH VĂN</div>
                                                <div className="amount-display" style={{fontSize: '16px', padding: '6px 12px'}}>
                                                    {sb.amount.toLocaleString()} đ
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-center mt-4">
                            <div className="d-flex justify-content-center gap-3">
                                <button 
                                    className="btn btn-warning text-white px-4 py-2 fw-bold shadow-sm"
                                    onClick={() => handleCallStaff()}
                                    disabled={isCallingStaff}
                                >
                                    {isCallingStaff ? "Đang gọi..." : "🔔 Gọi nhân viên hỗ trợ"}
                                </button>
                                <button 
                                    className="btn btn-outline-primary px-4 py-2 fw-bold"
                                    onClick={() => navigate(`/menu?table=${tableNumber || localStorage.getItem('tableNumber')}`, { replace: true })}
                                >
                                    Quay lại Menu
                                </button>
                            </div>
                            <p className="mt-4 text-secondary small fst-italic">Healthy Food Restaurant - Hân hạnh phục vụ quý khách!</p>
                        </div>
                    </div>
                </Container>
            ) : (
                <Container className='block-checkout'>
                    <div className="checkout-title">
                        <h2>Thanh toán</h2>
                        {orderSource === 'table' && tableNumber && (
                            <div className="table-number">
                                <span>Bàn số: {tableNumber}</span>
                            </div>
                        )}
                    </div>
                    <div className="checkout-content">
                        <Table>
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Số lượng</th>
                                    <th>Số tiền</th>
                                    <th>Đơn giá</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    cartItems.map((item, index) => {
                                        const { id, product_name, product_image, price, qty, total_price } = item;
                                        return (
                                            <tr key={index}>
                                                <td>
                                                    <img src={`http://localhost:5000/static/images/${product_image}`} alt="" />

                                                    <span className='product-name'>{product_name}</span>
                                                </td>
                                                <td>
                                                    <span className='product-quantity'>{qty}</span>
                                                </td>
                                                <td>
                                                    <span className='product-price'>{price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                                                </td>
                                                <td>
                                                    <span className='product-price'>{total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                                                </td>
                                            </tr>
                                        )
                                    })
                                }
                            </tbody>
                        </Table>

                        <div className="checkout-group">
                            <div className="checkout-info">
                                <div className="order-type-info">
                                    <label>Hình thức đặt hàng:</label>
                                    <span>{orderSource === 'table' ? 'Đặt tại bàn' : 'Đặt hàng online'}</span>
                                </div>
                                {orderSource === 'table' && tableNumber && (
                                    <div className="table-info">
                                        <label>Số bàn:</label>
                                        <span>{tableNumber}</span>
                                    </div>
                                )}
                            </div>

                            <div className="checkout-payment">
                                <label>Chọn phương thức thanh toán</label>
                                <Form.Select name="payment" onChange={handleSelectPayment}>
                                    <option value="">Phương thức thanh toán</option>
                                    <option value="cash">Trả bằng tiền mặt</option>
                                    <option value="transfer">Chuyển khoản</option>
                                </Form.Select>
                            </div>

                            <div className="checkout-box">
                                <div className="box-group">
                                    <label>Tổng tiền hàng</label>
                                    <span>{cartTotalPrice.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                                </div>
                                <hr />
                                <div className="box-group">
                                    <label className='title-order'>Số tiền thanh toán</label>
                                    <span className='price-order'>{cartTotalPrice.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                                </div>

                                <div className="d-flex w-100 gap-2">
                                    <button type="button" onClick={handleOrder} className='btn-checkout w-100'>{orderSource === 'table' ? 'Thanh toán' : 'Đặt hàng'}</button>
                                    <button type="button"
                                        onClick={handleOpenSplit}
                                        className='btn-checkout bg-warning text-white w-100'
                                        style={{ border: 'none' }}
                                    >
                                        Mở chia hóa đơn
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            )}

            {splitOrderPayload && (
                <SplitBillModal
                    show={showSplit}
                    onHide={() => setShowSplit(false)}
                    order={splitOrderPayload}
                    orderItems={splitOrderPayload.items || cartItems}
                    onSuccess={(splits, realOrderId) => {
                        setShowSplit(false);
                        setSplitSuccessData(splits);
                        if (realOrderId) {
                            setSplitOrderPayload(prev => ({ ...prev, id: realOrderId }));
                        }
                        if (orderSource === 'table') {
                            localStorage.removeItem('guestCart');
                            localStorage.removeItem('guestHasOrdered');
                            dispatch(setCartItems([]));
                            dispatch(setCartStore({ id: 'guest', total_item: 0, total_price: 0 }));
                        }
                    }}
                />
            )}

            {/* Modal hiển thị mã QR Thanh toán trực tiếp */}
            <Modal show={!!mainOrderQr} onHide={() => setMainOrderQr(null)} centered className={isZoomed ? "modal-qr-zoomed" : ""}>
                <Modal.Body className="p-0 border-0 overflow-hidden" style={{ borderRadius: '20px' }}>
                    <div className="vietqr-card">
                        <div className="card-header-branding">
                            <img src="/logos/vietqr_logo.png" alt="VietQR" className="vietqr-logo" />
                            <img src="/logos/mb_logo.png" alt="MB Bank" className="mb-logo-text" />
                        </div>

                        <div 
                            className={`qr-main-container ${isZoomed ? 'zoomed' : ''}`}
                            onClick={() => setIsZoomed(!isZoomed)}
                            style={{ cursor: 'zoom-in' }}
                        >
                            {mainOrderQr ? (
                                <QRCodeSVG 
                                    value={mainOrderQr.qrCode} 
                                    size={isZoomed ? 400 : 250} 
                                    level="H"
                                    imageSettings={{
                                        src: "/logos/mb_logo.png",
                                        x: undefined,
                                        y: undefined,
                                        height: isZoomed ? 56 : 35,
                                        width: isZoomed ? 56 : 35,
                                        excavate: true,
                                    }}
                                />
                            ) : (
                                <Spinner animation="border" variant="primary" />
                            )}
                        </div>

                        <div className="card-footer-info">
                            <div className="account-name">Chủ tài khoản:</div>
                            <div className="user-fullname">NGUYỄN KHÁNH VĂN</div>
                            <div className="amount-display">
                                {(mainOrderQr?.amount || 0).toLocaleString()} VNĐ
                            </div>
                        </div>

                        <div className="text-center instruction-text">
                            Quét mã bằng App ngân hàng hoặc Ví điện tử.<br/>
                            <span className="text-primary fw-bold" style={{cursor:'pointer'}} onClick={() => setIsZoomed(!isZoomed)}>
                                {isZoomed ? "Nhấn để thu nhỏ" : "Nhấn vào mã QR để phóng to"}
                            </span>
                        </div>
                    </div>
                    {/* Trạng thái chờ realtime */}
                    <div className="px-3 pb-3">
                        <div className="alert alert-info py-2 d-flex align-items-center justify-content-center gap-2 mb-0">
                            <Spinner animation="grow" size="sm" variant="info" />
                            <span className="mb-0">Đang chờ hệ thống xác nhận thanh toán...</span>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setMainOrderQr(null)}>
                        Đóng / Hủy
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default Checkout;