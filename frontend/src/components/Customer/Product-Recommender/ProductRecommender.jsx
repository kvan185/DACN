import React, { useEffect, useState } from 'react';
import { Row } from 'react-bootstrap';
import ProductCard from '../Product-Card/ProductCard';
import './productRecommender.scss';

function ProductRecommender({accessToken}) {
    const [productsRecommender, setProductsRecommender] = useState([]);
    
    const fetchProductsRecommender = async(accessToken) => {
        const response = await fetch('/api/product/recommender', {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        if(data.length > 0) setProductsRecommender(data);
    }

    useEffect(() => {
        if(accessToken) fetchProductsRecommender(accessToken);
    }, []);

    return (
        <div className='product__recommender'>
            <Row>
                {productsRecommender.length > 0 && productsRecommender.map((product, index) => {
                    return <ProductCard key={index} items={product}/>
                })}
            </Row>
        </div>
    );
}

export default ProductRecommender;