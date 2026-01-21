import React, {useState, useEffect} from 'react';
import Container from 'react-bootstrap/Container';
import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';

import './login.scss';
import { fetchInitCart } from '../../../actions/cart';

function Login() {
    const location = useLocation();
    const navigate = useNavigate();
    const [accessToken, setAccessToken] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        page: 'user'
    });
    const [returnUrl, setReturnUrl] = useState('/');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const returnUrl = params.get('returnUrl') || '/';
        setReturnUrl(returnUrl);
    }, [location]);

    function handleChange(event) {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    }

    const loginAccessToken = async () =>{
        const response = await fetch('/api/auth/', {
            method: 'get',
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
        });
      
        const user = await response.json();
        
        if(user){
            sessionStorage.setItem('user', JSON.stringify(user));
            navigate(returnUrl);
        }
    }

    if(accessToken) {
        loginAccessToken();
        fetchInitCart(accessToken);
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        if(formData.password.length >= 6){
            const response = await fetch('/api/auth/login', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if(response.ok){
                setAccessToken(data.accessToken);
                sessionStorage.setItem('accessToken', JSON.stringify(data.accessToken));
            }else{
                toast.error('Đăng nhập thất bại');
            }
        } else {
            toast.error('Mật khẩu phải ít nhất là 6 ký tự');
        }
    }

    return (
        <>
            <ToastContainer 
                position="top-right"
                autoClose={3000}
            />
            <Container className='block-login'>
                <h2>Đăng nhập</h2>
                <span>Đăng nhập và bắt đầu cuộc phiêu lưu ẩm thực của bạn!</span>

                <form className='login-form' onSubmit={handleSubmit}>
                    <div className='login-form-input'>
                        <input type="text" name='email' onChange={handleChange} placeholder='Nhập email của bạn' required/>
                    </div>

                    <div className='login-form-input'>
                        <input type="password" name='password' onChange={handleChange} placeholder='Nhập mật khẩu của bạn' required/>
                        <input type="hidden" name='page'/>
                    </div>

                    <div className='login-form-btn'>
                        <input type="submit" className='btn btn-login' value="Đăng nhập"/>
                    </div>
                    
                    <div className='login-form-register'>
                        <span>Chưa có tài khoản?</span>
                        <button type="button" onClick={() => navigate('/register')}>
                            Đăng ký ngay
                        </button>
                    </div>
                </form>
            </Container>
        </>
    );
}

export default Login;