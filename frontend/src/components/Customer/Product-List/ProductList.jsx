import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Row} from 'react-bootstrap';

import ProductCard from '../Product-Card/ProductCard';
import './productList.scss';

function ProductList(props) {
    const [products, setProducts] = useState([]);
    const categoryId = useSelector(state => state.user.categoryId);

    const fetchProducts = async () =>{
        if(categoryId){
            const response = await fetch(`/api/product/category/${categoryId}`);
            const data = await response.json();
    
            if (data.length > 0) {
                setProducts(data);
            }else{
                setProducts([]);
            }
        }
    }

    useEffect(()=>{
        fetchProducts();
    },[categoryId]);

    return (
        <div className='product-list'>
            <Row>
                {products && (
                    products.map((product, index)=>{
                        if(product.is_active){                     
                            return <ProductCard key={index} items={product}/>
                        }
                    })
                )}
            </Row>
        </div>
    );
}

export default ProductList;