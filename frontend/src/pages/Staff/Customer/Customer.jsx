import React, { useEffect, useState, useRef } from 'react';
import { Table, Modal, Form, Button, InputGroup } from 'react-bootstrap';
import { FaRegEdit, FaSearch, FaPlus } from 'react-icons/fa';
import { MdLock, MdLockOpen, MdDelete } from 'react-icons/md';
import { IoMdClose } from "react-icons/io";
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

    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 6;
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
            setCurrentPage(1);
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
        <div className="staff-management block-customer ps-0 pt-0">
            <h2 className="title-admin mb-4 mt-4" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748' }}>Quản lý Khách hàng
                <style>{`.title-admin::after { display: none !important; }`}</style> </h2>
            <div className="customer-container background-radius">
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="spinner-border text-success" role="status"></div>
                </div>
            </div>
        </div>
        );
    }

    return (
        <section className="staff-management block-customer ps-0 pt-0">
            <ToastContainer position="top-right" autoClose={2000} />

            <div className="staff-management__header d-flex justify-content-between align-items-center mb-4 mt-4 px-0">
                <h2 className="title-admin mb-0" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748', marginLeft: '0', paddingLeft: '0' }}>Quản lý Khách hàng
                    <style>{`.title-admin::after { display: none !important; }`}</style> </h2>
                <div className="d-flex align-items-center gap-2">
                    <div className="search-container" style={{ width: '380px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0 border-secondary-subtle">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm kiếm theo Tên, Email hoặc Số điện thoại..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="border-start-0 border-secondary-subtle ps-1 shadow-none"
                            />
                            {searchTerm && (
                                <InputGroup.Text
                                    className="bg-white border-start-0 cursor-pointer border-secondary-subtle"
                                    onClick={handleClearSearch}
                                >
                                    <IoMdClose className="text-secondary" />
                                </InputGroup.Text>
                            )}
                        </InputGroup>
                    </div>
                    <button className="btn btn-success ms-3 d-flex align-items-center gap-2" onClick={handleShowAddModal} style={{ padding: '10px 22px', borderRadius: '8px', fontWeight: '500' }}> <FaPlus /> Thêm khách hàng</button>
                </div>
            </div>

            <div className="pt-0 mt-0">
                <Table striped bordered hover className="mt-3 text-center align-middle">
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
                                        <td className="text-center">
                                            <button
                                                className="btn btn-sm btn-link p-1"
                                                title="Sửa thông tin"
                                                onClick={() => handleShowEditModal(cus)}
                                            >
                                                <FaRegEdit className='icon-update fs-5 text-success' />
                                            </button>

                                            {isUpdating ? (
                                                <span className="spinner-border spinner-border-sm text-secondary mx-2" role="status"></span>
                                            ) : (
                                                <button
                                                    className="btn btn-sm btn-link p-1"
                                                    title={isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                                                    onClick={() => handleToggleLock(customerId, isActive)}
                                                >
                                                    {isLocked ? (
                                                        <MdLockOpen className='icon-unlock fs-5 text-primary' />
                                                    ) : (
                                                        <MdLock className='icon-lock fs-5 text-warning' />
                                                    )}
                                                </button>
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
                    <div className="admin-pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Prev
                        </button>

                        {(() => {
                            const maxVisiblePages = 5;
                            const currentGroup = Math.ceil(currentPage / maxVisiblePages);
                            const startPage = (currentGroup - 1) * maxVisiblePages + 1;
                            const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
                            const pageNumbers = [];
                            for (let i = startPage; i <= endPage; i++) {
                                pageNumbers.push(
                                    <button key={i} className={currentPage === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>{i}</button>
                                );
                            }
                            return pageNumbers;
                        })()}

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Next
                        </button>
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