import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import './tableProduct.scss';
import PopupUpdateCart from '../PopupUpdateCart/PopupUpdateCart';
import { fetchGetCart, fetchDeleteCart } from '../../../actions/cart';
import { setCartStore, setCartItems } from '../../../actions/user';

const API_URL = import.meta.env.VITE_API_URL;

function TableProduct({ cartItems, selectedItems, setSelectedItems }) {
    const [modalShow, setModalShow] = useState(false);
    const [itemCart, setItemCart] = useState(null);
    const accessToken = sessionStorage.getItem("accessToken");
    const dispatch = useDispatch();

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(cartItems.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (e, id) => {
        if (e.target.checked) {
            setSelectedItems(prev => [...prev, id]);
        } else {
            setSelectedItems(prev => prev.filter(itemId => itemId !== id));
        }
    };

    const handleOpenPopup = (item) => {
        setItemCart(item);
        setModalShow(true);
    };

    const handleHidePopup = () => {
        setModalShow(false);
    };

    const handleDeleteItemCart = async (cartItemId, productName) => {
        const isConfirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa "${productName}" khỏi giỏ hàng không?`
        );

        if (isConfirmed) {
            if (accessToken && cartItemId) {
                await fetchDeleteCart(accessToken, cartItemId);

                const response = await fetchGetCart(accessToken);
                const data = await response.json();

                if (data && data.cart) {
                    dispatch(setCartStore(data.cart));
                    dispatch(setCartItems(data.cartItems));
                } else if (data && !data.cart) {
                    sessionStorage.removeItem("accessToken");
                    sessionStorage.removeItem("user");
                    window.location.href = '/login';
                }
            } else {
                const orderSource = localStorage.getItem('orderSource');
                if (orderSource === 'table') {
                    // Xử lý cho khách vãng lai
                    const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                    const updatedCart = guestCart.filter(item => item.id !== cartItemId);
                    
                    localStorage.setItem('guestCart', JSON.stringify(updatedCart));
                    
                    // Cập nhật Redux store để giao diện (Cart badge, Cart sidebar) thay đổi ngay
                    dispatch(setCartItems(updatedCart));
                    dispatch(setCartStore({
                        id: 'guest',
                        total_item: updatedCart.reduce((sum, i) => sum + i.qty, 0),
                        total_price: updatedCart.reduce((sum, i) => sum + i.total_price, 0)
                    }));

                    // Bỏ chọn item nếu nó đang được chọn
                    setSelectedItems(prev => prev.filter(id => id !== cartItemId));
                }
            }
        }
    };

    return (
        <>
            <PopupUpdateCart
                show={modalShow}
                onHide={handleHidePopup}
                backdrop="static"
                itemcart={itemCart}
            />

            <p style={{fontStyle: 'italic', marginBottom: '8px', color: '#666', fontSize: '14px'}}>
                * Chọn món để thanh toán
            </p>

            <Table>
                <thead>
                    <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                            <input 
                                type="checkbox" 
                                checked={cartItems?.length > 0 && selectedItems.length === cartItems.length}
                                onChange={handleSelectAll}
                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            />
                        </th>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Số tiền</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {cartItems.map((item, index) => {
                        const {
                            id,
                            product_name,
                            product_image,
                            price,
                            qty
                        } = item;

                        const imageSrc = product_image
                            ? (product_image.startsWith('/') ? `${API_URL}${product_image}` : `${API_URL}/images/products/${product_image}`)
                            : '/no-image.png';

                        return (
                            <tr key={index}>
                                <td style={{ textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedItems.includes(id)}
                                        onChange={(e) => handleSelectItem(e, id)}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                </td>
                                <td>
                                    <img
                                        src={imageSrc}
                                        alt={product_name}
                                        className="product-image"
                                    />
                                    <span className="product-name">
                                        {product_name}
                                    </span>
                                </td>
                                <td>
                                    <span className="product-quantity">{qty}</span>
                                </td>
                                <td>
                                    <span className="product-price">
                                        {price.toLocaleString('vi', {
                                            style: 'currency',
                                            currency: 'VND'
                                        })}
                                    </span>
                                </td>
                                <td>
                                    <div className="product-action">
                                        <button
                                            className="product-action-update"
                                            onClick={() => handleOpenPopup(item)}
                                        >
                                            Cập nhật
                                        </button>
                                        <span>|</span>
                                        <button
                                            className="product-action-delete"
                                            onClick={() =>
                                                handleDeleteItemCart(id, product_name)
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </>
    );
}

export default TableProduct;
