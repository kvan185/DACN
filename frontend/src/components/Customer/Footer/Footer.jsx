import React from 'react';
import { Container } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import './footer.scss';

function Footer() {

    const location = useLocation();

    const arrayNoneFooter = ['/search', '/login', '/register', '/profile', '/checkout'];
    const isNone = arrayNoneFooter.includes(location.pathname);

    return (
        <footer className={`footer ${isNone ? 'd-none' : ''}`}>
            <Container>

                <div className='footer__top'>

                    <div className="contactUs">
                        <div className="contactUs-section">
                            <h3>Customer Support</h3>
                            <p>Need help with your order? Contact 24/7 support team.</p>
                            <p>Email: Fastfoodokela@gmail.com</p>
                            <p>Hotline: 0907 7099</p>
                        </div>

                        <div className="contactUs-section">
                            <h3>Store Locations</h3>
                            <p>Visit our stores in Ho Chi Minh city to enjoy delicious meals.</p>
                            <p>12X An Duong Vuong Street, Ho Chi Minh City</p>
                            <p>23Y Nguyen Van Linh, HCM City</p>
                        </div>

                        <div className="contactUs-section">
                            <h3>Follow Us</h3>
                            <p>Facebook: @FastFoodExpress</p>
                            <p>Instagram: @fastfood.express</p>
                            <p>Twitter: @FastFoodX</p>
                        </div>
                    </div>

                </div>

                <hr />

                <div className='footer__produce'>
                    Copyright @{new Date().getFullYear()} HealthyFood
                </div>

            </Container>
        </footer>
    );
}

export default Footer;