import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';

import ProductList from '../../../components/Customer/Product-List/ProductList';
import ProductRecommender from '../../../components/Customer/Product-Recommender/ProductRecommender';
import Contact from '../../../components/Customer/Contact/Contact';
import Category from '../../../components/Customer/Category/Category';
import Cart from '../../../components/Customer/Cart/Cart';
import { getCategoryId, setDisplayToast } from '../../../actions/user';

import './home.scss';

function Home(props) {
    const [categories, setCategories] = useState([]);
    const [accessToken, setAccessToken] = useState(
        sessionStorage.getItem("accessToken"));
    const dispatch = useDispatch();
    const isToast = useSelector(state => state.user.isToast);

    const fetchCategory = async () => {
        const response = await fetch('/api/category/');
        const data = await response.json();

        if (data) {
            const categoryActive = data.filter((item) => item.is_active);
            if (categoryActive.length > 0) setCategories(categoryActive);

            const categoryFirst = data.find((item) => {
                if (item.is_active) return item.id;
            });

            const action = getCategoryId(categoryFirst.id);
            dispatch(action);
        }
    }

    useEffect(() => {
        fetchCategory();
    }, []);

    useEffect(() => {
        const token = sessionStorage.getItem("accessToken");
        setAccessToken(token);
    }, []);

    useEffect(() => {
        if (isToast) {
            toast.success('Đã thêm vào giỏ hàng');
            dispatch(setDisplayToast(!isToast));
            return;
        }
    }, [isToast]);

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1000}
            />
            <Cart accessToken={accessToken} />
            <Container className='block-product'>
                {
                    accessToken && (
                        <>
                            <h2>Gợi ý cho bạn</h2>
                            <ProductRecommender accessToken={accessToken} />
                        </>
                    )
                }

                <h2>Menu </h2>
                <Category categories={categories} />
                <ProductList />
                <Contact />
            </Container>
        </>
    );
}

export default Home;