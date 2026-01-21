import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FaSearch, FaUtensils } from 'react-icons/fa'; // Import icons

import './banner.scss';
import bannerImg from '../../../assets/img/banner.png';

function Banner(props) {
    const { isDisplay } = props;
    const [key, setKey] = useState('');
    const navigate = useNavigate();

    const handleSubmitSearch = (event) =>{
        event.preventDefault();
        if(key === '') return;
        navigate(`/search?key=${key}`);
    }

    if (isDisplay) {
        return (
            <div className='banner'>
                <Container>
                    <div className='banner__content'>
                        <h2 className='banner__content__title'>
                            Khám Phá Ẩm Thực Tại{' '}
                            <span className='highlight'>Nón Lá Burger</span>
                        </h2>
                        <div className='banner__content__desc'>
                            Trải nghiệm dịch vụ đặt món tiện lợi cùng với đa dạng món ăn ngon, 
                            hấp dẫn và chất lượng. Giao hàng nhanh chóng, đảm bảo độ ngon của món ăn.
                        </div>
                        <div className='banner__content__cta'>
                            <div className='banner__content__search-box'>
                                <form onSubmit={(event)=>handleSubmitSearch(event)}>
                                    <div className='search-input-wrapper'>
                                        <FaSearch className='search-icon' />
                                        <input 
                                            type='text' 
                                            onChange={(event)=>setKey(event.target.value)} 
                                            value={key} 
                                            name='key' 
                                            placeholder='Tìm kiếm món ăn yêu thích của bạn...'
                                        />
                                    </div>
                                    <button className='banner__content__btn search-btn' type="submit">
                                        Tìm Kiếm
                                    </button>
                                </form>
                            </div>
                            <div className='banner__content__features'>
                                <div className='feature-item'>
                                    <FaUtensils />
                                    <span>Đa dạng món ăn</span>
                                </div>
                                <div className='feature-item'>
                                    <i className="fas fa-shipping-fast"></i>
                                    <span>Giao hàng nhanh</span>
                                </div>
                                <div className='feature-item'>
                                    <i className="fas fa-shield-alt"></i>
                                    <span>Đảm bảo chất lượng</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='banner__image'>
                        <div className='image-wrapper'>
                            <img src={bannerImg} alt='TBayEAT Banner' title='TBayEAT - Đặt món ngon' />
                        </div>
                        <div className='banner__decoration'>
                            <div className='decoration-circle'></div>
                            <div className='decoration-dots'></div>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }
    
    return null;
}

export default Banner;