import React, { useEffect, useState } from 'react';
import { Row } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import ProductCard from '../../../components/Customer/Product-Card/ProductCard';
import contactImg from '../../../assets/img/contact.png';

import './search.scss';

function Search(props) {
    const location = useLocation();
    let key = location && location.search.substring(5);
    const [productSearch, setProductSearch] = useState([]);
    const [keyWords, setKeyWords] = useState('');

    const fetchSearch = async ()=>{
        const response = await fetch(`/api/product/search/${key}`);
        const data = await response.json();
        
        if(data) {
            setProductSearch(data);
        }
    }

    const handleSubmit = (event) =>{
        event.preventDefault();
        if(keyWords === '') return;
        window.location.href = `/search?key=${keyWords}`;
    }

    useEffect(()=>{
        fetchSearch();
    },[]);

    return (
        <div className='block__search container'>
            <div className="search__form">
                <form method='get' onSubmit={(event)=>handleSubmit(event)}>
                    <input type="text" value={keyWords} onChange={(event)=>setKeyWords(event.target.value)} placeholder='Tìm kiếm món ăn yêu thích'/>
                    <button>Tìm kiếm</button>
                </form>
            </div>
            {
                productSearch && productSearch.length > 0  ? (
                    <div className="search__product">
                        { productSearch.length > 0 && <span className='search__product-quantity'>Tìm thấy {productSearch.length} món ăn phù hợp</span> }

                        <div className="search__product-list">
                            <Row>
                                {productSearch && productSearch.map((product, index)=>{
                                    return <ProductCard key={index} items={product} fullCol={true}/>
                                })}
                            </Row>
                        </div>
                    </div>
                )
                :
                (
                    <div className='search__no'>
                        <span>Rất tiếc, không có món ăn nào phù hợp với tìm kiếm của Quý khách!</span>
                        <img src={contactImg} alt="" />
                    </div>
                )
            }
    
        </div>
    );
}

export default Search;