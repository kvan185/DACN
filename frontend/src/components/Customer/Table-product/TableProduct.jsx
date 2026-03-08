import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import './tableProduct.scss';
import PopupUpdateCart from '../PopupUpdateCart/PopupUpdateCart';
import { fetchGetCart, fetchDeleteCart } from '../../../actions/cart';
import { setCartStore, setCartItems } from '../../../actions/user';

const API_URL = import.meta.env.VITE_API_URL;

function TableProduct({ cartItems }) {
    const [modalShow, setModalShow] = useState(false);
    const [itemCart, setItemCart] = useState(null);
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const dispatch = useDispatch();

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

        if (isConfirmed && accessToken && cartItemId) {
            await fetchDeleteCart(accessToken, cartItemId);

            const response = await fetchGetCart(accessToken);
            const data = await response.json();

            if (data) {
                dispatch(setCartStore(data.cart));
                dispatch(setCartItems(data.cartItems));
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
                    {cartItems.map((item, index) => {
                        const {
                            id,
                            product_name,
                            product_image,
                            price,
                            qty
                        } = item;

                        const imageSrc = product_image
                            ? `${API_URL}${product_image}`
                            : '/no-image.png';

                        return (
                            <tr key={index}>
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
