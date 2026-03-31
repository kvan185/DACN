import React, { useState, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import './customer.scss';

function CustomerUpdate() {
    const { id } = useParams();
    const [customer, setCustomer] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: 'male',
        status: 'active'
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!id || id === 'undefined') {
            console.error('Invalid ID:', id);
            navigate('/staff/customer');
            return;
        }
        fetchCustomerDetail();
    }, [id]);

    const fetchCustomerDetail = async () => {
        try {
            console.log('Fetching customer ID:', id);
            const response = await fetch(`/api/admin/customer/${id}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Customer data received:', data);

            // Lấy dữ liệu từ response
            const customerData = data.customer || data;

            setCustomer({
                first_name: customerData.first_name || '',
                last_name: customerData.last_name || '',
                email: customerData.email || '',
                phone: customerData.phone || '',
                gender: customerData.gender || 'male',
                status: customerData.status || 'active'
            });
        } catch (error) {
            console.error('Error fetching customer:', error);
            alert('Không thể tải thông tin khách hàng');
            navigate('/staff/customer');
        } finally {
            setFetchLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!customer.first_name.trim()) {
            newErrors.first_name = 'Vui lòng nhập họ';
        }

        if (!customer.last_name.trim()) {
            newErrors.last_name = 'Vui lòng nhập tên';
        }

        if (!customer.email.trim()) {
            newErrors.email = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(customer.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        if (!customer.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^[0-9]{10}$/.test(customer.phone)) {
            newErrors.phone = 'Số điện thoại phải có 10 chữ số';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        console.log('Submitting update for customer ID:', id);
        console.log('Data to submit:', customer);

        if (!validateForm()) {
            console.log('Validation failed');
            return;
        }

        setLoading(true);

        try {
            // Chuẩn bị dữ liệu gửi đi
            const updateData = {
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone: customer.phone,
                gender: customer.gender,
                status: customer.status
            };

            console.log('Sending update request...');

            const response = await fetch(`/api/admin/customer/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            console.log('Response status:', response.status);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                alert('Cập nhật thông tin khách hàng thành công!');
                navigate('/staff/customer');
            } else {
                alert(data.message || `Lỗi: ${response.status} - Có lỗi xảy ra`);
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <section className="block-customer-admin">
                <h3 className="title-admin">Cập nhật khách hàng</h3>
                <div className="customer-container background-radius">
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        Đang tải thông tin khách hàng...
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="block-customer-admin">
            <h3 className="title-admin">Cập nhật khách hàng</h3>

            <div className="customer-container background-radius">
                <form className='customer-form' onSubmit={handleSubmit}>
                    <div className="row-form">
                        <Form.Group className='mb-4'>
                            <Form.Label>Họ <span className="required">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                value={customer.first_name}
                                onChange={(e) => setCustomer({ ...customer, first_name: e.target.value })}
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
                                value={customer.last_name}
                                onChange={(e) => setCustomer({ ...customer, last_name: e.target.value })}
                                isInvalid={!!errors.last_name}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.last_name}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className='mb-4'>
                        <Form.Label>Email <span className="required">*</span></Form.Label>
                        <Form.Control
                            type="email"
                            value={customer.email}
                            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                            isInvalid={!!errors.email}
                            disabled
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                            Email không thể thay đổi
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className='mb-4'>
                        <Form.Label>Số điện thoại <span className="required">*</span></Form.Label>
                        <Form.Control
                            type="tel"
                            value={customer.phone}
                            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                            isInvalid={!!errors.phone}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.phone}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <div className="row-form">
                        <Form.Group className="position-relative mb-4">
                            <Form.Label>Giới tính</Form.Label>
                            <Form.Select
                                value={customer.gender}
                                onChange={(e) => setCustomer({ ...customer, gender: e.target.value })}
                            >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </Form.Select>
                        </Form.Group>

                        {/* <Form.Group className="position-relative mb-4">
                            <Form.Label>Trạng thái</Form.Label>
                            <Form.Select
                                value={customer.status}
                                onChange={(e) => setCustomer({ ...customer, status: e.target.value })}
                            >
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Không hoạt động</option>
                                <option value="banned">Đã khóa</option>
                            </Form.Select>
                        </Form.Group> */}
                    </div>

                    <div className="form-actions">
                        <Button
                            className='btn btn-add'
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Đang xử lý...' : 'Cập nhật'}
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

export default CustomerUpdate;