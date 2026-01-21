import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {visibilityCart} from '../../../actions/user';
import { Container } from 'react-bootstrap';
import { Link } from "react-router-dom";
import logo from '../../../assets/img/logo.png';

import './header.scss';

function Header(props) {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const isCart = useSelector(state => state.user.isCart);
    const cart = useSelector(state => state.user.cart);
    const dispatch = useDispatch();

    function handleShowCart(){
        const action = visibilityCart(!isCart);
        dispatch(action);
    }

    const handleClickLogOut = (event)=>{
        event.preventDefault();

        sessionStorage.setItem('user', JSON.stringify(null));
        sessionStorage.setItem('accessToken', JSON.stringify(''));
        window.location.href = '/'
    }

    return (
        <div className='header'>
            <Container>
                <Link to='/' className='header__logo'>
                    <img src={logo} alt="TBayEAT Logo" />
                    <span className="header__brand-name">Nón Lá Burger</span>
                </Link>
        
                <div className='header__feature'>
                    <Link to="/table-reservation" className="header__feature-reservation">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="#F3BA00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 2V6M8 2V6M3 10H21M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01M16 18H16.01" stroke="#F3BA00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="desktop-only">Đặt bàn</span>
                    </Link>
                    {user ? (
                        <>
                            <div className='header__feature-cart' onClick={handleShowCart}>
                                <svg width="21" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.97689 9.84C3.01712 9.33881 3.24464 8.87115 3.61417 8.53017C3.98369 8.18918 4.46808 7.9999 4.97089 8H17.0289C17.5317 7.9999 18.0161 8.18918 18.3856 8.53017C18.7551 8.87115 18.9827 9.33881 19.0229 9.84L19.8259 19.84C19.848 20.1152 19.8129 20.392 19.7227 20.6529C19.6326 20.9139 19.4894 21.1533 19.3022 21.3562C19.115 21.5592 18.8878 21.7211 18.6349 21.8319C18.382 21.9427 18.109 21.9999 17.8329 22H4.16689C3.89081 21.9999 3.61774 21.9427 3.36487 21.8319C3.112 21.7211 2.8848 21.5592 2.69759 21.3562C2.51037 21.1533 2.36719 20.9139 2.27706 20.6529C2.18693 20.392 2.1518 20.1152 2.17389 19.84L2.97689 9.84V9.84Z" stroke="#F3BA00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M15 11V6C15 4.93913 14.5786 3.92172 13.8284 3.17157C13.0783 2.42143 12.0609 2 11 2C9.93913 2 8.92172 2.42143 8.17157 3.17157C7.42143 3.92172 7 4.93913 7 6V11" stroke="#F3BA00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>

                                {(cart && cart.total_item) > 0 && (

                                    <span className='quantity-cart-items'>
                                        {cart.total_item}
                                    </span>
                                )}
                            </div>

                            <div className="header__feature-user">
                                <span>{user.first_name + ' ' + user.last_name}</span>
                                <div className="header__user-dropdown">
                                    <ul>
                                        <li>
                                            <Link to={'/profile'}>Thông tin tài khoản</Link>
                                        </li>
                                        <li>
                                            <Link to={'/history-order'}>Lịch sử đơn hàng</Link>
                                        </li>
                                        <li>
                                            <Link onClick={(event) => handleClickLogOut(event)}>Đăng xuất</Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="header__feature-user mobile-only">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <div className="header__user-dropdown">
                                    <ul>
                                        <li>
                                            <Link to='/login'>Đăng nhập</Link>
                                        </li>
                                        <li>
                                            <Link to='/register'>Đăng ký</Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="header__feature-login desktop-only">
                                <Link to='/login'>Đăng nhập</Link>
                                <span>|</span>
                                <Link to='/register'>Đăng ký</Link>
                            </div>
                        </>
                    )}
                </div>
            </Container>
        </div>
    );
}

export default Header