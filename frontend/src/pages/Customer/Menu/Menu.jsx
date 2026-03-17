import React, { useState, useEffect } from 'react';
import { Container, Row } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import './menu.scss';
import ProductCard from '../../../components/Customer/Product-Card/ProductCard';
import CategoryList from '../../../components/Customer/Category/Category';
import Cart from '../../../components/Customer/Cart/Cart';
import { setDisplayToast } from '../../../actions/user';

function Menu() {
    const [tableNumber, setTableNumber] = useState(null);
    const [products, setProducts] = useState([]);
    const [orderSource, setOrderSource] = useState('online');
    const accessToken = sessionStorage.getItem("accessToken");
    const dispatch = useDispatch();
    const isToast = useSelector(state => state.user.isToast);
    const location = useLocation();
    const categoryId = useSelector(state => state.user.categoryId);
    const [categories, setCategories] = useState([]);

const fetchCategory = async () => {
    const response = await fetch('/api/category/');
    const data = await response.json();

    const categoryActive = data.filter(item => item.is_active);
    setCategories(categoryActive);

    const categoryFirst = categoryActive[0];
    if (categoryFirst) {
        dispatch(getCategoryId(categoryFirst.id));
        const res = await fetch(`/api/product/category/${categoryFirst.id}`);
        const productsData = await res.json();
        setProducts(productsData);
    }
};
useEffect(() => {
    fetchCategory();
}, []);

const fetchProducts = async () => {
    if(categoryId){
        const response = await fetch(`/api/product/category/${categoryId}`);
        const data = await response.json();
        setProducts(data);
    }
};
    useEffect(() => {
        fetchProducts();
    }, [categoryId]);

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
            toast.success('Đã thêm vào giỏ hàng');
            dispatch(setDisplayToast(!isToast));
        }
    }, [isToast]);

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1000}
            />
            <Container className='block-menu'>
                <div className="menu-products">
                    <h2>Thực Đơn</h2>
                    <div className="order-info">
                        {orderSource === 'table' ? (
                            <div className="table-info">
                                <span>Bàn số {tableNumber}</span>
                            </div>
                        ) : (
                            <div className="online-info">
                                <span>Đặt hàng online</span>
                            </div>
                        )}
                    </div>
                    <CategoryList categories={categories} />
                    <Row>
                        {products
                        .filter(product => {
                            if (!categoryId) return false; 
                            return product.category_id === categoryId;})
                            .map((product, index) => (
                            <ProductCard 
                            key={index} 
                            items={product}
                            orderSource={orderSource}/>))}
                            </Row>
                    </div>
                </Container>
        </>
    );
}

export default Menu;
