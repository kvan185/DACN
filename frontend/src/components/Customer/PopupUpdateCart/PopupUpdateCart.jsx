import React, { useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useDispatch } from 'react-redux';

import { setCartStore, setCartItems } from '../../../actions/user';
import { fetchUpdateCartItem, fetchGetCart } from '../../../actions/cart';
import './popupUpdateCart.scss';

const API_URL = import.meta.env.VITE_API_URL;

function PopupUpdateCart(props) {
    const [inputValue, setInputValue] = useState(0);
    const inputRef = useRef();
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const dispatch = useDispatch();

    const onChangeHandler = (event) => {
        setInputValue(Number(event.target.value));
    };

    const handlePlusProduct = () => {
        const quantity = Number(inputRef.current.value) + 1;
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

        if (inputValue > 0) {
            await fetchUpdateCartItem(accessToken, itemProduct);
        }

        if (accessToken) {
            const response = await fetchGetCart(accessToken);
            const data = await response.json();

            if (data) {
                dispatch(setCartStore(data.cart));
                dispatch(setCartItems(data.cartItems));
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
                        src={`${API_URL}${props.itemcart.product_image}`}
                        alt={props.itemcart.product_name}
                    />

                    <h4 className="modal__product-name">
                        {props.itemcart.product_name}
                    </h4>

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
                <button onClick={hanndleUpdate}>Xác nhận</button>
                <button className="btn-close-modal" onClick={props.onHide}>
                    Hủy bỏ
                </button>
            </Modal.Footer>
        </Modal>
    );
}

export default PopupUpdateCart;
