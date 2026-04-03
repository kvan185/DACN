// import React, { useState } from 'react';
// import { Button, Form } from 'react-bootstrap';
// import { useNavigate } from 'react-router-dom';
// import './customer.scss';

// function CustomerAdd() {
//     const [customerAdd, setCustomerAdd] = useState({
//         first_name: '',
//         last_name: '',
//         email: '',
//         phone: '',
//         gender: 'male',
//         age: '',
//         password: '',
//         confirm_password: ''
//     });
//     const [errors, setErrors] = useState({});
//     const [loading, setLoading] = useState(false);
//     const navigate = useNavigate();

//     // Validate form
//     const validateForm = () => {
//         const newErrors = {};

//         if (!customerAdd.first_name.trim()) {
//             newErrors.first_name = 'Vui lòng nhập họ';
//         }

//         if (!customerAdd.last_name.trim()) {
//             newErrors.last_name = 'Vui lòng nhập tên';
//         }

//         if (!customerAdd.email.trim()) {
//             newErrors.email = 'Vui lòng nhập email';
//         } else if (!/\S+@\S+\.\S+/.test(customerAdd.email)) {
//             newErrors.email = 'Email không hợp lệ';
//         }

//         if (!customerAdd.phone.trim()) {
//             newErrors.phone = 'Vui lòng nhập số điện thoại';
//         } else if (!/^[0-9]{10}$/.test(customerAdd.phone)) {
//             newErrors.phone = 'Số điện thoại phải có 10 chữ số';
//         }

//         if (!customerAdd.password) {
//             newErrors.password = 'Vui lòng nhập mật khẩu';
//         } else if (customerAdd.password.length < 6) {
//             newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
//         }

//         if (customerAdd.password !== customerAdd.confirm_password) {
//             newErrors.confirm_password = 'Mật khẩu xác nhận không khớp';
//         }

//         setErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
//     };

//     // Xử lý submit form
//     const handleSubmit = async (event) => {
//         event.preventDefault();

//         if (!validateForm()) {
//             return;
//         }

//         setLoading(true);

//         try {
//             const formData = new FormData();
//             formData.append("first_name", customerAdd.first_name);
//             formData.append("last_name", customerAdd.last_name);
//             formData.append("email", customerAdd.email);
//             formData.append("phone", customerAdd.phone);
//             formData.append("gender", customerAdd.gender);
//             formData.append("password", customerAdd.password);

//             const response = await fetch('/api/admin/customer/create', {
//                 method: 'POST',
//                 body: formData
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 alert('Thêm khách hàng thành công!');
//                 navigate('/staff/customer'); // Chuyển về trang danh sách khách hàng
//             } else {
//                 alert(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
//             }
//         } catch (error) {
//             console.error('Error adding customer:', error);
//             alert('Có lỗi xảy ra, vui lòng thử lại');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <section className="block-customer-admin">
//             <h3 className="title-admin">Thêm mới khách hàng</h3>

//             <div className="customer-container background-radius">
//                 <form className='customer-form' onSubmit={handleSubmit}>
//                     {/* Họ và tên */}
//                     <div className="row-form">
//                         <Form.Group className='mb-4'>
//                             <Form.Label>Họ <span className="required">*</span></Form.Label>
//                             <Form.Control
//                                 type="text"
//                                 name="first_name"
//                                 placeholder="Họ"
//                                 value={customerAdd.first_name}
//                                 onChange={(event) => setCustomerAdd({ ...customerAdd, first_name: event.target.value })}
//                                 isInvalid={!!errors.first_name}
//                             />
//                             <Form.Control.Feedback type="invalid">
//                                 {errors.first_name}
//                             </Form.Control.Feedback>
//                         </Form.Group>

//                         <Form.Group className='mb-4'>
//                             <Form.Label>Tên <span className="required">*</span></Form.Label>
//                             <Form.Control
//                                 type="text"
//                                 name="last_name"
//                                 placeholder="Tên"
//                                 value={customerAdd.last_name}
//                                 onChange={(event) => setCustomerAdd({ ...customerAdd, last_name: event.target.value })}
//                                 isInvalid={!!errors.last_name}
//                             />
//                             <Form.Control.Feedback type="invalid">
//                                 {errors.last_name}
//                             </Form.Control.Feedback>
//                         </Form.Group>
//                     </div>

//                     {/* Email */}
//                     <Form.Group className='mb-4'>
//                         <Form.Label>Email <span className="required">*</span></Form.Label>
//                         <Form.Control
//                             type="email"
//                             name="email"
//                             placeholder="example@email.com"
//                             value={customerAdd.email}
//                             onChange={(event) => setCustomerAdd({ ...customerAdd, email: event.target.value })}
//                             isInvalid={!!errors.email}
//                         />
//                         <Form.Control.Feedback type="invalid">
//                             {errors.email}
//                         </Form.Control.Feedback>
//                     </Form.Group>

//                     {/* Số điện thoại */}
//                     <Form.Group className='mb-4'>
//                         <Form.Label>Số điện thoại <span className="required">*</span></Form.Label>
//                         <Form.Control
//                             type="tel"
//                             name="phone"
//                             // placeholder="0123456789"
//                             value={customerAdd.phone}
//                             onChange={(event) => setCustomerAdd({ ...customerAdd, phone: event.target.value })}
//                             isInvalid={!!errors.phone}
//                         />
//                         <Form.Control.Feedback type="invalid">
//                             {errors.phone}
//                         </Form.Control.Feedback>
//                     </Form.Group>

//                     {/* Giới tính */}
//                     <div className="row-form">
//                         <Form.Group className="position-relative mb-4">
//                             <Form.Label>Giới tính</Form.Label>
//                             <Form.Select
//                                 value={customerAdd.gender}
//                                 onChange={(event) => setCustomerAdd({ ...customerAdd, gender: event.target.value })}
//                             >
//                                 <option value="male">Nam</option>
//                                 <option value="female">Nữ</option>
//                             </Form.Select>
//                         </Form.Group>

//                     </div>

//                     {/* Mật khẩu */}
//                     <div className="row-form">
//                         <Form.Group className='mb-4'>
//                             <Form.Label>Mật khẩu <span className="required">*</span></Form.Label>
//                             <Form.Control
//                                 type="password"
//                                 name="password"
//                                 placeholder="Nhập mật khẩu"
//                                 value={customerAdd.password}
//                                 onChange={(event) => setCustomerAdd({ ...customerAdd, password: event.target.value })}
//                                 isInvalid={!!errors.password}
//                             />
//                             <Form.Control.Feedback type="invalid">
//                                 {errors.password}
//                             </Form.Control.Feedback>
//                         </Form.Group>

//                         <Form.Group className='mb-4'>
//                             <Form.Label>Xác nhận mật khẩu <span className="required">*</span></Form.Label>
//                             <Form.Control
//                                 type="password"
//                                 name="confirm_password"
//                                 placeholder="Nhập lại mật khẩu"
//                                 value={customerAdd.confirm_password}
//                                 onChange={(event) => setCustomerAdd({ ...customerAdd, confirm_password: event.target.value })}
//                                 isInvalid={!!errors.confirm_password}
//                             />
//                             <Form.Control.Feedback type="invalid">
//                                 {errors.confirm_password}
//                             </Form.Control.Feedback>
//                         </Form.Group>
//                     </div>



//                     {/* Nút submit */}
//                     <div className="form-actions">
//                         <Button
//                             className='btn btn-add'
//                             type="submit"
//                             disabled={loading}
//                         >
//                             {loading ? 'Đang xử lý...' : 'Thêm mới'}
//                         </Button>
//                         <Button
//                             className='btn btn-cancel'
//                             type="button"
//                             onClick={() => navigate('/staff/customer')}
//                         >
//                             Hủy bỏ
//                         </Button>
//                     </div>
//                 </form>
//             </div>
//         </section>
//     );
// }

// export default CustomerAdd;


import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './customer.scss';

function CustomerAdd() {
    const [customerAdd, setCustomerAdd] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: 'male',
        password: '',
        confirm_password: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!customerAdd.first_name.trim()) {
            newErrors.first_name = 'Vui lòng nhập họ';
        }

        if (!customerAdd.last_name.trim()) {
            newErrors.last_name = 'Vui lòng nhập tên';
        }

        if (!customerAdd.email.trim()) {
            newErrors.email = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(customerAdd.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        if (!customerAdd.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^[0-9]{10}$/.test(customerAdd.phone)) {
            newErrors.phone = 'Số điện thoại phải có 10 chữ số';
        }

        if (!customerAdd.password) {
            newErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (customerAdd.password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        if (customerAdd.password !== customerAdd.confirm_password) {
            newErrors.confirm_password = 'Mật khẩu xác nhận không khớp';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Xử lý submit form
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // ✅ Sửa: Gửi dạng JSON thay vì FormData
            const response = await fetch('/api/admin/customer/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    first_name: customerAdd.first_name,
                    last_name: customerAdd.last_name,
                    email: customerAdd.email,
                    phone: customerAdd.phone,
                    gender: customerAdd.gender,
                    password: customerAdd.password
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Thêm khách hàng thành công!');
                navigate('/staff/customer');
            } else {
                alert(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
            }
        } catch (error) {
            console.error('Error adding customer:', error);
            alert('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="block-customer-admin">
            <h3 className="title-admin">Thêm mới khách hàng</h3>

            <div className="customer-container background-radius">
                <form className='customer-form' onSubmit={handleSubmit}>
                    {/* Họ và tên */}
                    <div className="row-form">
                        <Form.Group className='mb-4'>
                            <Form.Label>Họ <span className="required">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="first_name"
                                placeholder="Họ"
                                value={customerAdd.first_name}
                                onChange={(event) => setCustomerAdd({ ...customerAdd, first_name: event.target.value })}
                                isInvalid={!!errors.first_name}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.first_name}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className='mb-4'>
                            <Form.Label>Tên <span className="required">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="last_name"
                                placeholder="Tên"
                                value={customerAdd.last_name}
                                onChange={(event) => setCustomerAdd({ ...customerAdd, last_name: event.target.value })}
                                isInvalid={!!errors.last_name}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.last_name}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    {/* Email */}
                    <Form.Group className='mb-4'>
                        <Form.Label>Email <span className="required">*</span></Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            placeholder="example@email.com"
                            value={customerAdd.email}
                            onChange={(event) => setCustomerAdd({ ...customerAdd, email: event.target.value })}
                            isInvalid={!!errors.email}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                        </Form.Control.Feedback>
                    </Form.Group>

                    {/* Số điện thoại */}
                    <Form.Group className='mb-4'>
                        <Form.Label>Số điện thoại <span className="required">*</span></Form.Label>
                        <Form.Control
                            type="tel"
                            name="phone"
                            placeholder="0123456789"
                            value={customerAdd.phone}
                            onChange={(event) => setCustomerAdd({ ...customerAdd, phone: event.target.value })}
                            isInvalid={!!errors.phone}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.phone}
                        </Form.Control.Feedback>
                    </Form.Group>

                    {/* Giới tính */}
                    <div className="row-form">
                        <Form.Group className="position-relative mb-4">
                            <Form.Label>Giới tính</Form.Label>
                            <Form.Select
                                value={customerAdd.gender}
                                onChange={(event) => setCustomerAdd({ ...customerAdd, gender: event.target.value })}
                            >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </Form.Select>
                        </Form.Group>
                    </div>

                    {/* Mật khẩu */}
                    <div className="row-form">
                        <Form.Group className='mb-4'>
                            <Form.Label>Mật khẩu <span className="required">*</span></Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                placeholder="Nhập mật khẩu"
                                value={customerAdd.password}
                                onChange={(event) => setCustomerAdd({ ...customerAdd, password: event.target.value })}
                                isInvalid={!!errors.password}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.password}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className='mb-4'>
                            <Form.Label>Xác nhận mật khẩu <span className="required">*</span></Form.Label>
                            <Form.Control
                                type="password"
                                name="confirm_password"
                                placeholder="Nhập lại mật khẩu"
                                value={customerAdd.confirm_password}
                                onChange={(event) => setCustomerAdd({ ...customerAdd, confirm_password: event.target.value })}
                                isInvalid={!!errors.confirm_password}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.confirm_password}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    {/* Nút submit */}
                    <div className="form-actions">
                        <Button
                            className='btn btn-add'
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Đang xử lý...' : 'Thêm mới'}
                        </Button>
                        <Button
                            className='btn btn-cancel'
                            type="button"
                            onClick={() => navigate('/staff/customer')}
                        >
                            Hủy bỏ
                        </Button>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default CustomerAdd;