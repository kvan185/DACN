import React ,{ useState } from 'react';
import { Form } from "react-bootstrap";
import { FaEyeSlash, FaEye } from 'react-icons/fa';
import { useNavigate  } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';

import './resgister.scss';

function Resgister(props) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone: '',
        gender: '',
        role: 'STAFF'
    });
    const [showPassword, setShowPassword] = useState([]);
    const navigate = useNavigate();

    const handleTogglePassword = (index) =>{
        setShowPassword((prevPasswords) => {
            const updatedPasswords = [...prevPasswords];
            updatedPasswords[index] = !updatedPasswords[index];
            return updatedPasswords;
        });
    }

    const handleSubmitResgister = async(event)=>{
        event.preventDefault();

        if(formData.password.length >= 6 && formData.confirm_password.length >= 6){
            const response = await fetch('/api/auth/admin/register', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
            });
    
            if (response.ok) {
                navigate('/staff/login');
            }else{
                toast.error('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin');
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

            <div className='resgister__staff'>
                <h3 className="title-admin">Đăng ký tài khoản nhân viên</h3>

                <div className="resgister__staff-container background-radius">
                    <Form className="resgister__staff-form" action="post" onSubmit={handleSubmitResgister}>
                        <div className='form-group'>
                            <div className='register-form-input'>
                                <Form.Control required type="text" name='first_name' value={formData.first_name} 
                                onChange={(event)=>setFormData({...formData, first_name: event.target.value})} 
                                placeholder='Nhập tên của bạn' />
                            </div>

                            <div className='register-form-input'>
                                <Form.Control required type="text" name='last_name' value={formData.last_name} 
                                onChange={(event)=>setFormData({...formData, last_name: event.target.value})}
                                placeholder='Nhập họ của bạn'/>
                            </div>
                        </div>

                        <div className='register-form-input'>
                            <Form.Control required type="text" name='email' value={formData.email} 
                            onChange={(event)=>setFormData({...formData, email: event.target.value})} 
                            placeholder='Nhập email của bạn'/>
                        </div>

                        <div className='register-form-input'>
                            <Form.Control required type={ showPassword[0] ? 'text' : 'password' } name='password' value={formData.password} 
                            onChange={(event)=>setFormData({...formData, password: event.target.value})} 
                            placeholder='Nhập mật khẩu của bạn'/>
                            { showPassword[0] ? <FaEyeSlash onClick={()=>handleTogglePassword(0)} /> : <FaEye onClick={()=>handleTogglePassword(0)} /> }
                        </div>

                        <div className='register-form-input'>
                            <Form.Control required type={ showPassword[1] ? 'text' : 'password' } name='confirm_password' value={formData.confirm_password} 
                            onChange={(event)=>setFormData({...formData, confirm_password: event.target.value})} 
                            placeholder='Nhập lại mật khẩu của bạn'/>
                            { showPassword[1] ? <FaEyeSlash onClick={()=>handleTogglePassword(1)} /> : <FaEye onClick={()=>handleTogglePassword(1)} /> }
                        </div>

                        <div className='form-group'>
                            <div className='register-form-input'>
                                <Form.Control type="text" name='phone' value={formData.phone} 
                                onChange={(event)=>setFormData({...formData, phone: event.target.value})} 
                                placeholder='Nhập số điện thoại'/>
                            </div>

                            <Form.Select name="gender" id="gender" value={formData.gender} 
                            onChange={(event)=>setFormData({...formData, gender: event.target.value})}>
                                <option>Giới tính</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </Form.Select>
                        </div>

                        <button type="submit" className="btn btn-register">
                            Đăng ký
                        </button>
                    </Form>
                </div>
            </div>
        </>
    );
}

export default Resgister;