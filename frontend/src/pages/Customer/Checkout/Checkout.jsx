import React, { useEffect, useState } from 'react';
import { Container, Form, Table } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

import Cart from '../../../components/Customer/Cart/Cart';
import PopupOrderSuccess from '../../../components/Customer/PopupOrderSuccess/PopupOrderSuccess';
import { fetchGetCart } from '../../../actions/cart';
import { setCartItems, setCartStore } from '../../../actions/user';
import { fetchOrder, fetchPayment, fetchUpdateIsPayment, fetchGuestOrder, fetchGuestPayment, fetchPayGuestOrdersByTable, fetchTablePayment } from '../../../actions/order';
import SplitBillModal from '../../../components/SplitBillModal';
import './checkout.scss';

function Checkout(props) {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [showSplit, setShowSplit] = useState(false);
    const [splitOrderPayload, setSplitOrderPayload] = useState(null);
    const [splitSuccessData, setSplitSuccessData] = useState(null);
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
                window.location.href = `${data.paymentUrl}`;
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
                    <div className="checkout text-center shadow p-4 border bg-white rounded mt-4 mx-auto" style={{ maxWidth: '600px' }}>
                        <div className="mb-3">
                            {/* <span className="text-success fs-1">✅</span> */}
                        </div>
                        <h2 className="text-success mb-3 fw-bold">Tách hóa đơn thành công!</h2>
                        <h5 className="text-dark mb-4 px-3 fst-italic" style={{ lineHeight: '1.5' }}>
                            Quý khách vui lòng gọi nhân viên hỗ trợ hoặc đến quầy thu ngân đọc Bàn số <strong className="text-danger fs-4">{tableNumber || localStorage.getItem('tableNumber')}</strong> để tiến hành thanh toán.
                        </h5>

                        <div className="order__detail-group mt-4 p-3 border rounded border-warning text-start shadow-sm bg-light">
                            <h5 className="text-warning font-bold mb-3 text-center">Danh sách phần chia thanh toán</h5>
                            <Table bordered size="sm" className="text-center align-middle mb-0 bg-white">
                                <thead className="table-warning">
                                    <tr>
                                        <th>Khách hàng</th>
                                        <th>Số tiền phải trả</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {splitSuccessData.map((sb, idx) => (
                                        <tr key={idx}>
                                            <td className="fw-bold fs-6">{sb.user_name} <br /><small className="text-muted">({sb.percent}%)</small></td>
                                            <td className="text-danger fw-bold fs-6">{sb.amount.toLocaleString()} đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <p className="mt-4 text-secondary fst-italic mb-0">Cảm ơn quý khách đã sử dụng dịch vụ của Healthy Food Restaurant!</p>

                        <button className="btn btn-outline-primary mt-4 px-4 py-2 fw-bold" onClick={() => navigate(`/menu?table=${tableNumber || localStorage.getItem('tableNumber')}`, { replace: true })}>
                            Quay lại Menu
                        </button>
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
                                    <button onClick={handleOrder} className='btn-checkout w-100'>{orderSource === 'table' ? 'Thanh toán' : 'Đặt hàng'}</button>
                                    <button
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
                    onSuccess={(splits) => {
                        setShowSplit(false);
                        setSplitSuccessData(splits);
                        if (orderSource === 'table') {
                            localStorage.removeItem('guestCart');
                            localStorage.removeItem('guestHasOrdered');
                            dispatch(setCartItems([]));
                            dispatch(setCartStore({ id: 'guest', total_item: 0, total_price: 0 }));
                        }
                    }}
                />
            )}
        </>
    );
}

export default Checkout;