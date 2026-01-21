import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useNavigate  } from "react-router-dom";
import { FaEyeSlash, FaEye } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';

import card from "../../../assets/img/illustration_login.png";
import "./login.scss";

function Login(props) {
  const [accessToken, setAccessToken] = useState(null);
  const [infoLogin, setInfoLogin] = useState({
    email: "",
    password: "",
    page: "admin",
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleTogglePassword = () =>{
    setShowPassword(!showPassword);
  }

  const handleSubmitLogin = async (event) => {
    event.preventDefault();

    if(infoLogin.password.length >= 6){
      const response = await fetch("/api/auth/login", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(infoLogin),
      });
      const data = await response.json();
  
      if(response.ok){
        setAccessToken(data.accessToken);
        sessionStorage.setItem('accessToken', JSON.stringify(data.accessToken));
      } else {
        toast.error('Đăng nhập thất bại');
      }
    } else {
      toast.error('Mật khẩu phải ít nhất là 6 ký tự');
    }
  };

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
        navigate('/staff');
    }
  }

  if(accessToken) loginAccessToken();

  return (
    <section className="login">
        <ToastContainer 
            position="top-right"
            autoClose={3000}
        />
        <Container fluid>
            <Row>
            <Col xs={4}>
                <div className="login__banner">
                {/* <img src={logo} alt="logo" width="100" /> */}
                    <h3 className="card-title">Chào mừng bạn đến trở lại</h3>
                    <img src={card} alt="image" width="450" />
                </div>
            </Col>
            <Col xs={8}>
                <div className="login__main">
                    <h4 className="login-title">Đăng nhập</h4>
                    
                    <form className="login__form" action="post" onSubmit={handleSubmitLogin}>
                        <input
                            placeholder="Email"
                            type="text"
                            name="email"
                            onChange={(event) =>
                                setInfoLogin({ ...infoLogin, email: event.target.value })
                            }
                            required
                        />
                        <div className="form-group">
                          <input
                              placeholder="Password"
                              type={ showPassword ? 'text' : 'password' }
                              name="password"
                              onChange={(event) =>
                                  setInfoLogin({ ...infoLogin, password: event.target.value })
                              }  
                              required                  
                              />
                              { showPassword ? <FaEyeSlash onClick={handleTogglePassword} /> : <FaEye onClick={handleTogglePassword} /> }
                        </div>
                        <button type="submit" className="btn btn-success">
                            Đăng nhập
                        </button>
                    </form>
                </div>
            </Col>
            </Row>
        </Container>
    </section>
  );
}

export default Login;
