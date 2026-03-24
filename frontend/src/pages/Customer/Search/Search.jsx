import React, { useEffect, useState } from 'react';
import { Row } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import ProductCard from '../../../components/Customer/Product-Card/ProductCard';
import contactImg from '../../../assets/img/contact.png';

import './search.scss';

function Search(props) {
    const location = useLocation();
    let key = new URLSearchParams(location.search).get('key') || '';    const [productSearch, setProductSearch] = useState([]);
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
        if(key){
            fetchSearch();
        }
    },[key]);

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
                        { productSearch.length > 0 && <span className='search__product-quantity'> Tìm thấy {productSearch.length} món ăn phù hợp với "{key}"</span> }

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
                    <div className='search__no'> <span>Rất tiếc, không có món ăn nào phù hợp với "{key}"</span>                        <img src={contactImg} alt="" />
                    </div>
                )
            }
    
        </div>
    );
}

export default Search;