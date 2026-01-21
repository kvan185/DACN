import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { useDispatch } from 'react-redux';

import pizza from '../../../assets/img/pizza.jpg';
import './tableProduct.scss';
import PopupUpdateCart from '../PopupUpdateCart/PopupUpdateCart';
import { fetchGetCart, fetchDeleteCart } from '../../../actions/cart';
import {setCartStore, setCartItems} from '../../../actions/user';

function TableProduct({cartItems}) {
    const [modalShow, setModalShow] = useState(false);
    const [itemCart, setItemCart] = useState(null);
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const dispatch = useDispatch();

    const handleOpenPopup = (item) =>{
        setItemCart(item);
        setModalShow(true);
    }

    const handleHidePopup = () =>{
        setModalShow(false);
    }

    const handleDeleteItemCart = async (cartItemId, productName) => {
        const isConfirmed = window.confirm(`Bạn có chắc chắn muốn xóa "${productName}" khỏi giỏ hàng không?`);
        
        if (isConfirmed) {
            if(accessToken && cartItemId) {
                await fetchDeleteCart(accessToken, cartItemId);

                if (accessToken) {
                    const getItemsCart = async () => {
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
            }
        }
    }

    return (
        <>
            <PopupUpdateCart
                show={modalShow}
                onHide={() => handleHidePopup()}
                backdrop="static"
                itemcart={itemCart}
            />
            <Table>
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Số tiền</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        cartItems.map((item, index)=>{
                            const {id, product_name, product_image, price, qty} = item;
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
                                        <div className="product-action">
                                            <button 
                                                className='product-action-update' 
                                                variant="primary" 
                                                onClick={() => handleOpenPopup(item)}
                                            >
                                                Cập nhập
                                            </button>
                                            <span>|</span>
                                            <button 
                                                className='product-action-delete' 
                                                onClick={() => handleDeleteItemCart(id, product_name)}
                                            >
                                                Xóa 
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </Table>
        </>
    );
}

export default TableProduct;