import React, {useEffect, useState} from 'react';
import { Container, Form, Table } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import Cart from '../../../components/Customer/Cart/Cart';
import PopupOrderSuccess from '../../../components/Customer/PopupOrderSuccess/PopupOrderSuccess';
import { fetchGetCart } from '../../../actions/cart';
import { setCartItems, setCartStore } from '../../../actions/user';
import { fetchOrder, fetchPayment, fetchUpdateIsPayment } from '../../../actions/order';
import './checkout.scss';

function Checkout(props) {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [orderSource, setOrderSource] = useState('online');
    const [tableNumber, setTableNumber] = useState(null);
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const cart = useSelector(state => state.user.cart);
    const cartItems = useSelector(state => state.user.cartItems);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(()=>{
        if(accessToken){
            const getItemsCart = async ()=>{
                const response = await fetchGetCart(accessToken);
                const data = await response.json();
    
                if(data){
                    const cartAction = setCartStore(data.cart);
                    const cartItemsAction = setCartItems(data.cartItems);
                    dispatch(cartAction);
                    dispatch(cartItemsAction);
                }
            }
            getItemsCart();
        }
    }, []);

    useEffect(() => {
        // Khôi phục trạng thái orderSource và tableNumber
        const savedOrderSource = localStorage.getItem('orderSource');
        const savedTableNumber = localStorage.getItem('tableNumber');
        
        if (savedOrderSource) {
            setOrderSource(savedOrderSource);
            if (savedOrderSource === 'table' && savedTableNumber) {
                setTableNumber(savedTableNumber);
            }
        }
    }, []);

    const handleSelectPayment = (event)=>{
        const paymentMethodValue = event.target.value;
        setPaymentMethod(paymentMethodValue);
    }

    const handleOrder = async (event)=>{
        event.preventDefault;
        const cartId = cart.id;
        
        if(paymentMethod === '' || cartId === null){
            toast.error('Vui lòng chọn phương thức thanh toán');
            return;
        }
    
        if(paymentMethod === 'cash'){
            const data = await fetchOrder(cartId, orderSource, tableNumber);

            if(data.success) {
                if (orderSource === 'table') {
                    localStorage.removeItem('tableNumber');
                    localStorage.removeItem('orderSource');
                }
                return setShowPopup(true);
            }
        }else{
            const data = await fetchPayment(cartId);

            if(data && data.paymentUrl !== ''){
                window.location.href = `${data.paymentUrl}`;
            }
        }
    }

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        
        const myParam = urlParams.get('vnp_TransactionStatus');
        const orderInfo = urlParams.get('vnp_OrderInfo');
        var arrOId = '';
        if (orderInfo) {
            arrOId = orderInfo.split(':');
        }

        if(myParam === '00'){ 
            fetchUpdateIsPayment(arrOId[1], true);
            return setShowPopup(true);
        }
    }, []);

    if(!accessToken){
        navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
    }

    return (
        <>
            <ToastContainer 
                position="top-right"
                autoClose={3000}
            /> 

            <Cart accessToken={accessToken}/>
            <PopupOrderSuccess 
                show={showPopup}
                backdrop="static"
            />
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
                                cartItems.map((item, index)=>{
                                    const {id, product_name, product_image, price, qty, total_price} = item;
                                    return (
                                        <tr key={index}>
                                            <td>
                                                <img src={`http://localhost:8080/static/images/${product_image}`} alt="" />

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
                                <option value="transfer">Chuyển khoản ngân hàng</option>
                            </Form.Select>
                        </div>

                        <div className="checkout-box">
                            <div className="box-group">
                                <label>Tổng tiền hàng</label>
                                <span>{cart && cart.total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                            </div>
                            <hr />
                            <div className="box-group">
                                <label className='title-order'>Số tiền thanh toán</label>
                                <span className='price-order'>{cart && cart.total_price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</span>
                            </div>

                            <button onClick={handleOrder} className='btn-checkout'>Đặt hàng</button>
                        </div>
                    </div>
                </div>
            </Container>
        </>
    );
}

export default Checkout;