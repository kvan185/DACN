import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Row } from 'react-bootstrap';

import ProductCard from '../Product-Card/ProductCard';
import { socket } from '../../../socket';
import './productList.scss';

function ProductList(props) {
    const [products, setProducts] = useState([]);
    const categoryId = useSelector(state => state.user.categoryId);

    const fetchProducts = async () => {
        if (categoryId) {
            const response = await fetch(`/api/product/category/${categoryId}`);
            const data = await response.json();

            if (data.length > 0) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        }
    }

    useEffect(() => {
        fetchProducts();

        // Lắng nghe sự kiện cập nhật trạng thái sản phẩm (is_active)
        // Lắng nghe tín hiệu kho thay đổi để tải lại dữ liệu mới nhất
        socket.on('stock_changed', () => {
            fetchProducts();
        });

        return () => {
            socket.off('stock_changed');
        };
    }, [categoryId]);

    return (
        <div className='product-list'>
            <Row>
                {products && (
                    products.map((product, _id) => {
                        return <ProductCard key={_id} items={product} />
                    })
                )}
            </Row>
        </div>
    );
}

export default ProductList;