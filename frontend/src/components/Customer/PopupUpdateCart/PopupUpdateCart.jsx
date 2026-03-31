import React, { useRef, useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useDispatch } from 'react-redux';

import { setCartStore, setCartItems } from '../../../actions/user';
import { fetchUpdateCartItem, fetchGetCart } from '../../../actions/cart';
import './popupUpdateCart.scss';

const API_URL = import.meta.env.VITE_API_URL;

function PopupUpdateCart(props) {
    const [inputValue, setInputValue] = useState(0);
    const [maxQuantity, setMaxQuantity] = useState(Infinity);
    const inputRef = useRef();
    const accessToken = sessionStorage.getItem("accessToken");
    const dispatch = useDispatch();
    const orderSource = localStorage.getItem('orderSource');

    const fetchIngredientsByProduct = async (productId) => {
        try {
            const res = await fetch(`/api/productBom/product/${productId}`);
            const data = await res.json();
            if (data && data.length > 0) {
                let max = Infinity;

                data.forEach(item => {
                    const stock = item.ingredient_id?.qty;
                    if (stock === undefined) return;
                    const need = item.quantity;
                    if (!need || need <= 0) return;
                    const possible = Math.floor(stock / need);
                    max = Math.min(max, possible);
                });

                const finalMax = max === Infinity ? 0 : max;
                setMaxQuantity(finalMax);
            } else {
                setMaxQuantity(0);
            }
        } catch (err) {
            console.error(err);
            setMaxQuantity(0);
        }
    };

    useEffect(() => {
        if (props.itemcart) {
            setInputValue(props.itemcart.qty);
            const pId = props.itemcart.product_id || props.itemcart.id;
            if (pId) {
                fetchIngredientsByProduct(pId);
            } else {
                setMaxQuantity(Infinity);
            }
        }
    }, [props.itemcart]);

    const onChangeHandler = (event) => {
        let value = Number(event.target.value);
        if (maxQuantity !== Infinity && value > maxQuantity) {
            value = maxQuantity;
        }
        setInputValue(value);
    };

    const handlePlusProduct = () => {
        let quantity = Number(inputRef.current.value) + 1;
        if (maxQuantity !== Infinity && quantity > maxQuantity) {
            quantity = maxQuantity;
        }
        setInputValue(quantity);
    };

    const handleMinusProduct = () => {
        const quantity = Math.max(0, Number(inputRef.current.value) - 1);
        setInputValue(quantity);
    };

    const hanndleUpdate = async () => {
        const itemProduct = [
            { id: props.itemcart.product_id, qty: inputValue }
        ];

        if (accessToken) {
            if (inputValue > 0) {
                await fetchUpdateCartItem(accessToken, itemProduct);
            }

            const response = await fetchGetCart(accessToken);
            const data = await response.json();

            if (data) {
                dispatch(setCartStore(data.cart));
                dispatch(setCartItems(data.cartItems));
            }
        } else if (orderSource === 'table') {
            const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
            const itemIndex = guestCart.findIndex(item => item.id === props.itemcart.id);

            if (itemIndex > -1) {
                if (inputValue > 0) {
                    guestCart[itemIndex].qty = inputValue;
                    guestCart[itemIndex].total_price = inputValue * guestCart[itemIndex].price;
                } else {
                    // Nếu qty = 0, xóa khỏi giỏ
                    guestCart.splice(itemIndex, 1);
                }

                localStorage.setItem('guestCart', JSON.stringify(guestCart));

                // Cập nhật Redux store để giao diện (Cart badge, Cart sidebar) thay đổi ngay
                dispatch(setCartItems(guestCart));
                dispatch(setCartStore({
                    id: 'guest',
                    total_item: guestCart.reduce((sum, i) => sum + i.qty, 0),
                    total_price: guestCart.reduce((sum, i) => sum + i.total_price, 0)
                }));
            }
        }

        props.onHide();
        setInputValue(0);
    };

    return (
        <Modal
            {...props}
            size="lg"
            centered
            className="modal__product"
        >
            <Modal.Header>
                <Modal.Title>
                    Cập nhật sản phẩm
                </Modal.Title>
            </Modal.Header>

            {props.itemcart && (
                <Modal.Body>
                    <img
                        className="modal__product-img"
                        src={props.itemcart.product_image?.startsWith('/') ? `${API_URL}${props.itemcart.product_image}` : `${API_URL}/images/products/${props.itemcart.product_image}`}
                        alt={props.itemcart.product_name}
                    />

                    <h4 className="modal__product-name">
                        {props.itemcart.product_name}
                    </h4>

                    {maxQuantity !== Infinity && maxQuantity > 0 && (
                        <p style={{ color: "green", fontSize: "14px", marginTop: "10px", textAlign: "center" }}>
                            Có thể đặt tối đa: {maxQuantity} món
                        </p>
                    )}
                    {maxQuantity === 0 && (
                        <p style={{ color: "red", fontSize: "14px", marginTop: "10px", textAlign: "center" }}>
                            Món ăn đã hết nguyên liệu
                        </p>
                    )}

                    <div className="modal__product-update">
                        <div className="minus" onClick={handleMinusProduct}>
                            −
                        </div>

                        <input
                            ref={inputRef} type="text" name='quantity' onChange={onChangeHandler} value={inputValue ? inputValue : props.itemcart.qty} 
                        />
                        <div className="plus" onClick={handlePlusProduct}>
                            +
                        </div>
                    </div>
                </Modal.Body>
            )}

            <Modal.Footer>
                <button className="btn-confirm" onClick={hanndleUpdate}>
                    Xác nhận
                </button>
                <button className="btn-close-modal" onClick={props.onHide}>
                    Hủy bỏ
                </button>
            </Modal.Footer>
        </Modal>
    );
}

export default PopupUpdateCart;
