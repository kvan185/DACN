import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Table, Modal } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import { FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import './stafflist.scss';

const StaffList = () => {
    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState('All'); // Added role filter
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone: '',
        age: '',
        gender: '',
        role: 'STAFF' // Default when creating
    });
    
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
    const [showPassword, setShowPassword] = useState([false, false]);
    const fileInputRef = useRef(null);

    const accessToken = sessionStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Fetch staffs on init, page change, role change, or search change
    useEffect(() => {
        fetchStaffs();
    }, [currentPage, debouncedSearch, selectedRole]);

    const fetchStaffs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                role: selectedRole
            }).toString();

            const response = await fetch(`/api/staff?${query}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Lỗi tải danh sách người dùng');
            }

            const data = await response.json();
            setStaffs(data.staffs);
            setTotalPages(data.totalPages);
            if (data.currentPage !== currentPage) {
                setCurrentPage(data.currentPage); 
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) setSelectedImage(file);
    };

    const handleTogglePassword = (index) => {
        setShowPassword((prev) => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            confirm_password: '',
            phone: '',
            age: '',
            gender: '',
            role: 'STAFF'
        });
        setSelectedImage(null);
        setCurrentAvatarUrl('');
        setShowPassword([false, false]);
        setSelectedStaffId(null);
        setIsEditMode(false);
    };

    const handleShowAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleShowEditModal = (staff) => {
        resetForm();
        setIsEditMode(true);
        setSelectedStaffId(staff._id || staff.id);
        setCurrentAvatarUrl(staff.avatar || '');
        setFormData({
            first_name: staff.first_name || '',
            last_name: staff.last_name || '',
            email: staff.email || '',
            password: '',
            confirm_password: '',
            phone: staff.phone || '',
            age: staff.age || '',
            gender: staff.gender || '',
            role: staff.role || 'STAFF'
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!isEditMode || (formData.password || formData.confirm_password)) {
            if (formData.password !== formData.confirm_password) {
                return toast.error('Xác nhận mật khẩu không khớp!');
            }
            if (formData.password.length < 6) {
                return toast.error('Mật khẩu phải ít nhất là 6 ký tự');
            }
        }

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        if (selectedImage) {
            data.append('avatar', selectedImage);
        }

        try {
            const method = isEditMode ? 'PUT' : 'POST';
            const endpoint = isEditMode ? `/api/staff/${selectedStaffId}` : '/api/staff';

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                body: data
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Thao tác thất bại');
            }

            toast.success(result.message || 'Thành công!');
            handleCloseModal();
            fetchStaffs();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
            try {
                const response = await fetch(`/api/staff/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Xóa thất bại');

                toast.success('Xóa tài khoản thành công!');
                fetchStaffs();
            } catch (error) {
                toast.error(error.message);
            }
        }
    };

    const getAvatarSrc = (staff) => {
        if (staff.avatar) return `${API_URL}${staff.avatar}`;
        return null;
    };

    return (
        <div className="staff-management">
            <ToastContainer position="top-right" autoClose={1500} />
            <div className="staff-management__header d-flex justify-content-between align-items-center mb-4">
                <h2>Quản lý tài khoản Admin / Nhân viên</h2>
                <div className="d-flex align-items-center gap-2">
                    {/* Role Filter Combobox */}
                    <Form.Select 
                        value={selectedRole} 
                        onChange={(e) => {
                            setSelectedRole(e.target.value);
                            setCurrentPage(1); // Reset page on filter
                        }}
                        style={{ width: '150px' }}
                    >
                        <option value="All">Tất cả quyền</option>
                        <option value="ADMIN">Quản lý (ADMIN)</option>
                        <option value="STAFF">Nhân viên (STAFF)</option>
                    </Form.Select>
                    
                    <Form.Control
                        type="text"
                        placeholder="Tìm theo tên, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '280px' }}
                    />
                    <Button className="btn btn-success ms-3" onClick={handleShowAddModal}>Thêm tài khoản</Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center mt-4">
                    <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : staffs.length === 0 ? (
                <div className="alert alert-info text-center mt-4">
                    Không tìm thấy danh sách nào phù hợp.
                </div>
            ) : (
                <>
                    <Table striped bordered hover className="mt-3 text-center align-middle">
                        <thead className="table-success">
                            <tr>
                                <th>Avatar</th>
                                <th>Họ Tên</th>
                                <th>Email</th>
                                <th>Quyền</th>
                                <th>SĐT</th>
                                <th>Giới tính</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffs.map((staff) => (
                                <tr key={staff.id || staff._id}>
                                    <td>
                                        {getAvatarSrc(staff) ? (
                                            <img src={getAvatarSrc(staff)} alt="avatar" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} />
                                        ) : (
                                            <div style={{width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'}}>
                                                <FaUser color="#6c757d" />
                                            </div>
                                        )}
                                    </td>
                                    <td>{`${staff.first_name} ${staff.last_name}`}</td>
                                    <td>{staff.email}</td>
                                    <td>
                                        <span className={`badge ${staff.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                                            {staff.role}
                                        </span>
                                    </td>
                                    <td>{staff.phone}</td>
                                    <td>{staff.gender === 'male' ? 'Nam' : staff.gender === 'female' ? 'Nữ' : staff.gender}</td>
                                    <td>
                                        <Button variant="primary" size="sm" onClick={() => handleShowEditModal(staff)} className="me-2">Sửa</Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(staff.id || staff._id)}>Xóa</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    
                    {totalPages > 1 && (
                        <div className="pagination d-flex justify-content-center mt-3 gap-2">
                            <button
                                className="btn btn-secondary"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                Prev
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    className={`btn ${currentPage === i + 1 ? 'btn-success' : 'btn-outline-success'}`}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                className="btn btn-secondary"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            <Modal show={showModal} onHide={handleCloseModal} size="lg" className="staff-modal">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} className="staff-form">
                        <div className="avatar-section text-center mb-4">
                            <div 
                                className="avatar-preview-box" 
                                onClick={handleAvatarClick} 
                                style={{
                                    cursor: 'pointer', margin: '0 auto', width: '120px', height: '120px',
                                    borderRadius: '50%', backgroundColor: '#f8f9fa',
                                    border: '1px solid #ced4da', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                }}
                            >
                                {selectedImage || currentAvatarUrl ? (
                                    <img
                                        src={selectedImage ? URL.createObjectURL(selectedImage) : `${API_URL}${currentAvatarUrl}`}
                                        alt="avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <FaUser size={60} color="#6c757d" />
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/jpeg, image/png, image/jpg"
                                onChange={handleImageChange}
                                ref={fileInputRef}
                                style={{ display: "none" }}
                            />
                            <p className="mt-2 text-muted" style={{fontSize: '14px', cursor: 'pointer'}} onClick={handleAvatarClick}>
                                Nhấn để tải ảnh lên
                            </p>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Control required type="text" value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    placeholder='Nhập họ' />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Control required type="text" value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    placeholder='Nhập tên' />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-8 mb-3">
                                <Form.Control required={!isEditMode} type="email" value={formData.email} disabled={isEditMode}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder='Nhập email (dùng để đăng nhập)' />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Select value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="STAFF">Quyền: STAFF</option>
                                    <option value="ADMIN">Quyền: ADMIN</option>
                                </Form.Select>
                            </div>
                        </div>

                        <div className="position-relative mb-3 input-pwd-wrapper">
                            <Form.Control required={!isEditMode} type={showPassword[0] ? 'text' : 'password'} value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={isEditMode ? 'Nhập mật khẩu mới (Bỏ trống nếu không đổi)' : 'Nhập mật khẩu'} />
                            <div className="pwd-icon" onClick={() => handleTogglePassword(0)} style={{position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer'}}>
                                {showPassword[0] ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>

                        <div className="position-relative mb-3 input-pwd-wrapper">
                            <Form.Control required={!isEditMode && formData.password.length > 0} type={showPassword[1] ? 'text' : 'password'} value={formData.confirm_password}
                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                placeholder={isEditMode ? 'Nhập lại mật khẩu mới' : 'Nhập lại mật khẩu'} />
                            <div className="pwd-icon" onClick={() => handleTogglePassword(1)} style={{position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer'}}>
                                {showPassword[1] ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <Form.Control type="text" value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder='Số điện thoại' />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Control type="number" min="0" value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    placeholder='Tuổi' />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Select value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="">Giới tính</option>
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                </Form.Select>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={handleCloseModal}>Hủy bỏ</Button>
                            <Button variant="success" type="submit">{isEditMode ? 'Lưu thay đổi' : 'Đăng ký'}</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default StaffList;
