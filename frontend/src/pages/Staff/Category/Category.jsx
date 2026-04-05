import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Table, InputGroup, Form } from 'react-bootstrap';
import { FaRegEdit, FaSearch } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { IoMdClose } from "react-icons/io";
import { toast } from 'react-toastify';

import './category.scss';

function Category(props) {
    const [categoryList, setCategoryList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    // Search properties
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef(null);

    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 6;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCategories = categoryList.slice(indexOfFirstItem, indexOfLastItem);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [actionType, setActionType] = useState('ADD'); // 'ADD' | 'UPDATE'
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [currentImage, setCurrentImage] = useState('');
    const modalRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        image: null
    });

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [showModal]);

    const handleBackdropClick = (e, closeModalFunc) => {
        if (e.target === e.currentTarget) closeModalFunc();
    };

    const totalPages = Math.ceil(categoryList.length / itemsPerPage);

    const fetchListCate = async (searchQuery = '') => {
        setIsSearching(true);
        try {
            const url = searchQuery ? `/api/category?search=${encodeURIComponent(searchQuery)}` : '/api/category';
            const response = await fetch(url);
            const data = await response.json();
            setCategoryList(data || []);
            setCurrentPage(1);
        } catch (error) {
            console.error('Fetch categories error:', error);
        } finally {
            setIsSearching(false);
        }
    }

    useEffect(() => {
        fetchListCate();
    }, []);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => fetchListCate(value), 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        fetchListCate('');
    };

    const handleDeleteCateItem = async (cateId) => {
        const result = window.confirm('Bạn có muốn xóa danh mục này?');
        if (result && cateId) {
            try {
                const response = await fetch(`/api/category/${cateId}`, { method: 'delete' });
                if (response.ok) {
                    toast.success('Xóa danh mục thành công');
                    await fetchListCate(searchTerm);
                } else {
                    toast.error('Lỗi khi xóa danh mục');
                }
            } catch (error) {
                toast.error('Lỗi kết nối máy chủ');
            }
        }
    }

    const openAddModal = () => {
        setActionType('ADD');
        setFormData({ name: '', image: null });
        setCurrentImage('');
        setSelectedCategoryId(null);
        setShowModal(true);
    };

    const openUpdateModal = (category) => {
        setActionType('UPDATE');
        setFormData({ name: category.name, image: null });
        setCurrentImage(category.image);
        setSelectedCategoryId(category.id || category._id);
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, image: e.target.files[0] });
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (actionType === 'ADD' && !formData.image) {
            toast.warn('Vui lòng chọn hình ảnh đại diện danh mục');
            return;
        }
        if (!formData.name.trim()) {
            toast.warn('Vui lòng nhập tên danh mục');
            return;
        }

        const formDataObj = new FormData();
        formDataObj.append('name', formData.name);
        if (formData.image) formDataObj.append('image', formData.image);

        const url = actionType === 'ADD' ? '/api/category' : `/api/category/${selectedCategoryId}`;
        const method = actionType === 'ADD' ? 'POST' : 'PUT';

        setActionLoading(true);
        try {
            const res = await fetch(url, { method, body: formDataObj });
            if (res.ok) {
                toast.success(actionType === 'ADD' ? 'Thêm danh mục thành công' : 'Cập nhật danh mục thành công');
                closeModal();
                fetchListCate(searchTerm);
            } else {
                const data = await res.json();
                toast.error(data.message || 'Lỗi khi lưu danh mục');
            }
        } catch (error) {
            toast.error('Lỗi kết nối máy chủ');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="staff-management block-category ps-0 pt-0">
            <div className="staff-management__header d-flex justify-content-between align-items-center mb-4 mt-4 px-0">
                <h2 className="title-admin mb-0" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748', marginLeft: '0', paddingLeft: '0' }}>Quản lý danh mục
                    <style>{`.title-admin::after { display: none !important; }`}</style> </h2>                <div className="d-flex align-items-center gap-2">
                    <div className="search-container" style={{ width: '380px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm kiếm danh mục..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="border-start-0 border-end-0 shadow-none"
                            />
                            {searchTerm && (
                                <InputGroup.Text
                                    className="bg-white border-start-0 cursor-pointer"
                                    onClick={handleClearSearch}
                                >
                                    <IoMdClose className="text-secondary" />
                                </InputGroup.Text>
                            )}
                        </InputGroup>
                    </div>
                    <button className="btn btn-success ms-3 d-flex align-items-center gap-2" onClick={openAddModal}> + Thêm mới</button>
                </div>
            </div>

            <div className="pt-0 mt-0">
                <Table striped bordered hover className="mt-3 text-center align-middle">
                    <thead className="table-success">
                        <tr>
                            <th>STT</th>
                            <th>Tên danh mục</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isSearching ? (
                            <tr><td colSpan="4" className="text-center py-4">Đang tìm kiếm...</td></tr>
                        ) : currentCategories.length > 0 ? (
                            currentCategories.map((cateItem, index) => {
                                const { id, _id, name, is_active } = cateItem;
                                const cateId = id || _id;

                                return (
                                    <tr key={cateId}>
                                        <td>{indexOfFirstItem + index + 1}</td>
                                        <td>{name}</td>
                                        <td>
                                            <span className={`category-status ${is_active ? 'active' : 'inactive'}`}>
                                                {is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-link" onClick={() => openUpdateModal(cateItem)}>
                                                <FaRegEdit className='icon-update fs-5' />
                                            </button>
                                            <button className="btn btn-sm btn-link" onClick={() => handleDeleteCateItem(cateId)}>
                                                <MdDelete className='icon-delete fs-5 text-danger' />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="4" className="text-center py-4 text-muted">Không tìm thấy danh mục</td></tr>
                        )}
                    </tbody>
                </Table>

                {showModal && createPortal(
                    <div className="custom-global-modal-overlay" onMouseDown={(e) => handleBackdropClick(e, closeModal)}>
                        <div className="custom-global-modal-content border-0" ref={modalRef} style={{ width: '450px' }}>
                            <h4 className="modal-header-title">
                                {actionType === 'ADD' ? 'Thêm mới danh mục' : 'Cập nhật danh mục'}
                            </h4>

                            <form onSubmit={handleFormSubmit} className="modal-form d-flex flex-column">
                                <div className="form-group mb-3">
                                    <label className="fw-medium mb-1">Tên danh mục <span className="text-danger">*</span></label>
                                    <input required type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nhập tên danh mục..." />
                                </div>

                                <div className="form-group mb-4">
                                    <label className="fw-medium mb-1">Hình ảnh đại diện {actionType === 'ADD' && <span className="text-danger">*</span>}</label>
                                    <input type="file" accept="image/*" className="form-control" onChange={handleFileChange} />
                                    {currentImage && actionType === 'UPDATE' && !formData.image && (
                                        <div className="mt-2 img-preview-container">
                                            <img src={`${import.meta.env.VITE_API_URL}/static/images/${currentImage}`} alt="Preview" height="60" />
                                            <span className="text-muted fs-6">Ảnh hiện tại</span>
                                        </div>
                                    )}
                                </div>

                                <div className="modal-actions pt-3 border-top mt-auto">
                                    <button type="button" className="btn btn-secondary px-4 me-3 rounded-3" onClick={closeModal} disabled={actionLoading}>Hủy</button>
                                    <button type="submit" className="btn btn-close-modal px-4 bg-success text-white border-0 rounded-3 shadow-sm" disabled={actionLoading}>
                                        {actionLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                                        {actionType === 'ADD' ? 'Thêm mới' : 'Cập nhật'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                <div className="admin-pagination">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</button>
                    {totalPages > 0 && (() => {
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
                    <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                </div>
            </div>
        </div>
    );
}

export default Category;