import React, { useEffect, useState, useRef } from 'react';
import { Table, Modal, Form, Button } from 'react-bootstrap';
import { FaRegEdit } from 'react-icons/fa';
import { MdLock, MdLockOpen } from 'react-icons/md';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './customer.scss';

function Customer() {
    const [customerList, setCustomerList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: 'male',
        password: '',
        confirm_password: ''
    });

    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCustomers = customerList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(customerList.length / itemsPerPage);

    const debounceTimeoutRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // 🔹 Lấy danh sách khách hàng
    const fetchCustomers = async (searchQuery = '') => {
        setLoading(true);
        setIsSearching(true);
        try {
            const url = searchQuery ? `/api/admin/customer?search=${encodeURIComponent(searchQuery)}` : '/api/admin/customer';
            const res = await fetch(url);
            const data = await res.json();
            
            if (Array.isArray(data)) {
                setCustomerList(data);
            } else if (data.customers && Array.isArray(data.customers)) {
                setCustomerList(data.customers);
            } else if (data.data && Array.isArray(data.data)) {
                setCustomerList(data.data);
            } else {
                setCustomerList([]);
            }
            if (searchQuery) setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching customers:', error);
            setCustomerList([]);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            fetchCustomers(value);
        }, 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        fetchCustomers('');
    };

    // 🔹 Khóa/Mở khóa tài khoản
    const handleToggleLock = async (id, currentStatus) => {
        const action = currentStatus === false ? 'mở khóa' : 'khóa';

        const result = window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản này?`);

        if (result) {
            setUpdatingId(id);
            try {
                const res = await fetch(`/api/admin/customer/toggle-status/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();

                if (res.ok) {
                    toast.success(`${action} tài khoản thành công!`);
                    fetchCustomers(searchTerm);
                } else {
                    toast.error(`Lỗi: ${data.message || 'Không thể thay đổi trạng thái'}`);
                }
            } catch (error) {
                console.error('Error toggling lock:', error);
                toast.error('Có lỗi xảy ra, vui lòng thử lại');
            } finally {
                setUpdatingId(null);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            gender: 'male',
            password: '',
            confirm_password: ''
        });
        setSelectedCustomerId(null);
        setIsEditMode(false);
    };

    const handleShowAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleShowEditModal = (customer) => {
        resetForm();
        setIsEditMode(true);
        setSelectedCustomerId(customer._id || customer.id);
        setFormData({
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            gender: customer.gender || 'male',
            password: '',
            confirm_password: ''
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    // 🔹 Xử lý Submit (Thêm/Sửa)
    const handleSubmit = async (event) => {
        event.preventDefault();

        // Validation front-end
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            return toast.error('Vui lòng nhập họ và tên');
        }
        
        if (!isEditMode) {
            if (!formData.password || formData.password.length < 6) {
                return toast.error('Mật khẩu phải ít nhất 6 ký tự');
            }
            if (formData.password !== formData.confirm_password) {
                return toast.error('Xác nhận mật khẩu không khớp');
            }
        }

        try {
            const endpoint = isEditMode ? `/api/admin/customer/${selectedCustomerId}` : '/api/admin/customer/create';
            const method = isEditMode ? 'PUT' : 'POST';

            const payloadData = { ...formData };
            if (isEditMode) {
                // Remove password fields when updating if not needed to avoid sending them unexpectedly
                delete payloadData.password;
                delete payloadData.confirm_password;
            }

            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Thao tác thất bại');
            }

            toast.success(result.message || (isEditMode ? 'Cập nhật thành công!' : 'Thêm mới thành công!'));
            handleCloseModal();
            fetchCustomers(searchTerm); // Re-fetch
        } catch (error) {
            toast.error(error.message);
        }
    };


    if (loading && customerList.length === 0 && !isSearching) {
        return (
            <section className="block-customer-admin">
                <h3 className="title-admin">Danh sách khách hàng</h3>
                <div className="customer-container background-radius">
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <div className="spinner-border text-success" role="status"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="block-customer-admin">
            <ToastContainer position="top-right" autoClose={2000} />
            <h3 className="title-admin">Danh sách khách hàng</h3>

            <div className="customer-container background-radius">
                <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
                    <div className="product-add mb-0">
                        <Button variant="success" onClick={handleShowAddModal}>
                            + Thêm mới
                        </Button>
                    </div>

                    <div className="search-container" style={{ width: '380px' }}>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <i className="fa fa-search text-muted"></i>
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo Tên, Email hoặc Số điện thoại..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="form-control border-start-0 border-end-0 shadow-none"
                            />
                            {searchTerm && (
                                <span 
                                    className="input-group-text bg-white border-start-0" 
                                    onClick={handleClearSearch}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="fa fa-times text-secondary"></i>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <Table striped bordered hover className="customer-table text-center align-middle" responsive>
                    <thead className="table-success">
                        <tr>
                            <th>STT</th>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>SĐT</th>
                            <th>Giới tính</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>

                    <tbody>
                        {currentCustomers.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                    Không có dữ liệu khách hàng
                                </td>
                            </tr>
                        ) : (
                            currentCustomers.map((cus, index) => {
                                const customerId = cus._id || cus.id;

                                if (!customerId) return null;

                                const fullName = `${cus.first_name || ''} ${cus.last_name || ''}`.trim();
                                // is_active can be true/false. If undefined, we assume true because of default: true
                                const isActive = cus.is_active !== false; 
                                const isLocked = !isActive;
                                const isUpdating = updatingId === customerId;

                                return (
                                    <tr key={customerId} className={isLocked ? 'table-secondary text-muted' : ''}>
                                        <td>{indexOfFirstItem + index + 1}</td>
                                        <td>{fullName}</td>
                                        <td>{cus.email}</td>
                                        <td>{cus.phone}</td>
                                        <td>
                                            {cus.gender === 'male' ? 'Nam' : cus.gender === 'female' ? 'Nữ' : 'Khác'}
                                        </td>
                                        <td>
                                            <span className={`badge ${isActive ? 'bg-success' : 'bg-danger'}`}>
                                                {isActive ? 'Hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                className="me-2"
                                                onClick={() => handleShowEditModal(cus)}
                                            >
                                                Sửa
                                            </Button>

                                            {isUpdating ? (
                                                <Button variant="secondary" size="sm" disabled>...</Button>
                                            ) : (
                                                <Button
                                                    variant={isLocked ? "success" : "danger"}
                                                    size="sm"
                                                    onClick={() => handleToggleLock(customerId, isActive)}
                                                >
                                                    {isLocked ? <MdLockOpen /> : <MdLock />}
                                                    {isLocked ? ' Mở khóa' : ' Khóa'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination d-flex justify-content-center mt-3 gap-2">
                        <Button
                            variant="outline-secondary"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Prev
                        </Button>

                        {[...Array(totalPages)].map((_, i) => (
                            <Button
                                key={i}
                                variant={currentPage === i + 1 ? 'success' : 'outline-success'}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </Button>
                        ))}

                        <Button
                            variant="outline-secondary"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal Form Thêm/Sửa */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}</Modal.Title>
                </Modal.Header>
                
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <div className="row">
                            <Form.Group className="col-md-6 mb-3">
                                <Form.Label>Họ <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </Form.Group>

                            <Form.Group className="col-md-6 mb-3">
                                <Form.Label>Tên <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </Form.Group>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={isEditMode} // Không cho đổi email khi edit
                            />
                            {isEditMode && <Form.Text className="text-muted">Email không thể thay đổi</Form.Text>}
                        </Form.Group>

                        <div className="row">
                            <Form.Group className="col-md-6 mb-3">
                                <Form.Label>Số điện thoại <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </Form.Group>

                            <Form.Group className="col-md-6 mb-3">
                                <Form.Label>Giới tính</Form.Label>
                                <Form.Select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                </Form.Select>
                            </Form.Group>
                        </div>

                        {/* Chỉ hiện mật khẩu ở form Add */}
                        {!isEditMode && (
                            <div className="row">
                                <Form.Group className="col-md-6 mb-3">
                                    <Form.Label>Mật khẩu <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </Form.Group>

                                <Form.Group className="col-md-6 mb-3">
                                    <Form.Label>Xác nhận mật khẩu <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={formData.confirm_password}
                                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                    />
                                </Form.Group>
                            </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Hủy bỏ
                            </Button>
                            <Button variant="success" type="submit">
                                {isEditMode ? 'Lưu cập nhật' : 'Thêm khách hàng'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </section>
    );
}

export default Customer;