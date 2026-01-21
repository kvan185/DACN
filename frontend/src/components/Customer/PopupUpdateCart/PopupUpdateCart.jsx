import React, {useRef, useState} from 'react';
import { Modal } from 'react-bootstrap';
import { useDispatch } from 'react-redux';

import pizza from '../../../assets/img/pizza.jpg';
import {setCartStore, setCartItems} from '../../../actions/user';
import { fetchUpdateCartItem, fetchGetCart } from '../../../actions/cart';
import './popupUpdateCart.scss';

function PopupUpdateCart(props) {
    const [inputValue, setInputValue] = useState(0);
    const inputRef =useRef();
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const dispatch = useDispatch();

    const onChangeHandler = event => {
        setInputValue(event.target.value);
    };

    const handlePlusProduct = () =>{
        let quantity = +inputRef.current.value + 1;
        setInputValue(quantity);
    }

    const handleMinusProduct = () =>{
        let quantity = +inputRef.current.value - 1;
        setInputValue(quantity);
    }

    const hanndleUpdate = async () =>{
        let itemProduct = [{id: props.itemcart.product_id, qty: inputValue}];
        if(inputValue > 0){
            await fetchUpdateCartItem(accessToken, itemProduct);
        }

        if (accessToken) {
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
        props.onHide();
        setInputValue(null);
    }

    return (
        <Modal
          {...props}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
          centered
          className='modal__product'
        >
          <Modal.Header>
            <Modal.Title id="contained-modal-title-vcenter">
              Cập nhập sản phẩm
            </Modal.Title>
          </Modal.Header>
          {props.itemcart &&  
            (
                <Modal.Body>
                    <img className='modal__product-img' src={pizza} alt="" />
                    <h4 className='modal__product-name'>{props.itemcart.product_name}</h4>
                    <div className='modal__product-update'>
                        <div className="minus" onClick={() => handleMinusProduct()}>
                            <svg width="8" height="4" viewBox="0 0 6 2" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.93103 0H0V1.47826H5.93103V0Z" fill="#1AC073"/>
                            </svg>
                        </div>
                        <input ref={inputRef} type="text" name='quantity' onChange={onChangeHandler} value={inputValue ? inputValue : props.itemcart.qty} />
                        <div className="plus" onClick={() => handlePlusProduct()}>
                            <svg width="8" height="8" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.93103 2.21741H0V3.69567H5.93103V2.21741Z" fill="#1AC073"/>
                                <path d="M3.70673 5.91304L3.70673 0L2.22397 0V5.91304H3.70673Z" fill="#1AC073"/>
                            </svg>
                        </div>
                    </div>
                </Modal.Body>
            )
          }
          <Modal.Footer>
            <button onClick={() => hanndleUpdate()}>Xác nhận</button>
            <button className='btn-close-modal' onClick={props.onHide}>Hủy bỏ</button>
          </Modal.Footer>
        </Modal>
      );
}

export default PopupUpdateCart;