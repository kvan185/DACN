import React, { useState, useEffect } from 'react';
import { Container, Row } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';

import ProductCard from '../../../components/Customer/Product-Card/ProductCard';
import Cart from '../../../components/Customer/Cart/Cart';
import { setDisplayToast } from '../../../actions/user';

function Menu() {
    const [tableNumber, setTableNumber] = useState(null);
    const [products, setProducts] = useState([]);
    const [orderSource, setOrderSource] = useState('online');
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const dispatch = useDispatch();
    const isToast = useSelector(state => state.user.isToast);
    const location = useLocation();

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/product/');
            if (!response.ok) {
                throw new Error('Lỗi khi tải sản phẩm');
            }
            const data = await response.json();
            
            if (data) {
                const activeProducts = data.filter(product => product.is_active);
                setProducts(activeProducts);
            }
        } catch (error) {
            console.error('Lỗi khi tải sản phẩm:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const table = params.get('table');
        if (table) {
            setTableNumber(table);
            setOrderSource('table');
            localStorage.setItem('tableNumber', table);
            localStorage.setItem('orderSource', 'table');
        } else {
            setOrderSource('online');
            localStorage.setItem('orderSource', 'online');
        }
    }, [location]);

    useEffect(() => {
        // Khôi phục trạng thái khi load lại trang
        const savedOrderSource = localStorage.getItem('orderSource');
        const savedTableNumber = localStorage.getItem('tableNumber');
        
        if (savedOrderSource) {
            setOrderSource(savedOrderSource);
            if (savedOrderSource === 'table' && savedTableNumber) {
                setTableNumber(savedTableNumber);
            }
        }
    }, []);

    useEffect(() => {
        if (isToast) {
            toast.success('Sản phẩm đã được thêm vào giỏ hàng');
            dispatch(setDisplayToast(!isToast));
        }
    }, [isToast]);

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={3000}
            />
            <Cart 
                accessToken={accessToken} 
                tableNumber={tableNumber}
                orderSource={orderSource}
            />
            <Container className='block-menu'>
                <div className="menu-products">
                    <h2>Thực Đơn</h2>
                    <div className="order-info">
                        {orderSource === 'table' ? (
                            <div className="table-info">
                                <span>Đặt tại bàn số: {tableNumber}</span>
                            </div>
                        ) : (
                            <div className="online-info">
                                <span>Đặt hàng online</span>
                            </div>
                        )}
                    </div>
                    <Row>
                        {products.map((product, index) => (
                            <ProductCard 
                                key={index} 
                                items={product}
                                orderSource={orderSource}
                            />
                        ))}
                    </Row>
                </div>
            </Container>
        </>
    );
}

export default Menu;
