import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { useNavigate  } from "react-router-dom";
import { FaEyeSlash, FaEye } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';

import './register.scss';

function Register(props) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone: '',
        gender: ''
    });
    const [showPassword, setShowPassword] = useState([]);
    const navigate = useNavigate();

    function handleChange(event) {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    }

    const handleSubmit = async (event) =>{
        event.preventDefault();

        if(formData.password.length >= 6 && formData.confirm_password.length >= 6){
            const response = await fetch('/api/auth/register', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Đăng ký thành công!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                toast.error(data.message);
            }
        } else {
            toast.error('Mật khẩu phải ít nhất là 6 ký tự');
        }
    }

    const handleTogglePassword = (index) =>{
        setShowPassword((prevPasswords) => {
            const updatedPasswords = [...prevPasswords];
            updatedPasswords[index] = !updatedPasswords[index];
            return updatedPasswords;
        });
    }

    return (
        <>
            <ToastContainer 
                position="top-right"
                autoClose={3000}
            />
            <Container className='block-register'>
                <h2>Đăng ký</h2>
                <span>Tạo tài khoản để trải nghiệm ẩm thực tuyệt vời!</span>

                <form className='register-form' onSubmit={handleSubmit}>
                    <div className='form-group name-group'>
                        <div className='register-form-input'>
                            <input 
                                type="text" 
                                name='last_name' 
                                value={formData.last_name} 
                                onChange={handleChange} 
                                placeholder='Họ' 
                                required
                            />
                        </div>

                        <div className='register-form-input'>
                            <input 
                                type="text" 
                                name='first_name' 
                                value={formData.first_name} 
                                onChange={handleChange} 
                                placeholder='Tên' 
                                required
                            />
                        </div>
                    </div>

                    <div className='register-form-input'>
                        <input 
                            type="email" 
                            name='email' 
                            value={formData.email} 
                            onChange={handleChange} 
                            placeholder='Email' 
                            required
                        />
                    </div>

                    <div className='register-form-input'>
                        <input 
                            type="password"
                            name='password' 
                            value={formData.password} 
                            onChange={handleChange} 
                            placeholder='Mật khẩu' 
                            required
                        />
                    </div>

                    <div className='register-form-input'>
                        <input 
                            type="password"
                            name='confirm_password' 
                            value={formData.confirm_password} 
                            onChange={handleChange} 
                            placeholder='Xác nhận mật khẩu' 
                            required
                        />
                    </div>

                    <div className='form-group'>
                        <div className='register-form-input'>
                            <input 
                                type="tel" 
                                name='phone' 
                                value={formData.phone} 
                                onChange={handleChange} 
                                placeholder='Số điện thoại'
                            />
                        </div>

                        <select 
                            name="gender" 
                            value={formData.gender} 
                            onChange={handleChange}
                        >
                            <option value="">Chọn giới tính</option>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                        </select>
                    </div>

                    <div className='register-form-btn'>
                        <input type="submit" value="Đăng ký ngay"/>
                    </div>
                </form>
            </Container>
        </>
    );
}

export default Register;