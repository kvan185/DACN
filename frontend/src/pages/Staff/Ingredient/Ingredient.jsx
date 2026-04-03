import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Table } from 'react-bootstrap';
import { FaRegEdit } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { toast } from 'react-toastify';
// import { fetchIngredients } from '../../../actions/ingredient';

import './ingredient.scss';

function Ingredient() {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = ingredients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(ingredients.length / itemsPerPage);

    // Search properties
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef(null);

    // Action (Add/Update) Modal States
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState('ADD'); // 'ADD' | 'UPDATE'
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedIngredientId, setSelectedIngredientId] = useState(null);
    const actionModalRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        qty: '',
        unit: '',
        note: '',
        is_active: true
    });

    useEffect(() => {
        // Prevent body scroll when modal is open
        if (showActionModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showActionModal]);

    const handleBackdropClick = (e, closeModalFunc) => {
        // Only close if the click is exactly on the overlay background
        if (e.target === e.currentTarget) {
            closeModalFunc();
        }
    };

    const getData = async (searchQuery = '') => {
        try {
            setLoading(true);
            setIsSearching(true);
            const url = searchQuery ? `/api/ingredient?search=${encodeURIComponent(searchQuery)}` : '/api/ingredient';
            const res = await fetch(url);
            const data = await res.json();
            setIngredients(data || []);
            if (searchQuery) setCurrentPage(1);
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi tải danh sách nguyên liệu');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => getData(value), 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        getData('');
    };

    useEffect(() => {
        getData();
    }, []);

    const handleDeleteItem = async (id) => {
        const result = window.confirm('Bạn có chắc chắn muốn xóa nguyên liệu này?');

        if (result && id) {
            try {
                const response = await fetch(`/api/ingredient/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    toast.success('Xóa nguyên liệu thành công');
                    await getData(searchTerm);
                    
                    const newTotalItems = ingredients.length - 1;
                    const maxPage = Math.ceil(newTotalItems / itemsPerPage);
                    if (currentPage > maxPage && maxPage > 0) {
                        setCurrentPage(maxPage);
                    }
                } else {
                    toast.error('Lỗi khi xóa nguyên liệu');
                }
            } catch (error) {
                toast.error('Lỗi kết nối máy chủ');
            }
        }
    }

    const openAddModal = () => {
        setActionType('ADD');
        setFormData({
            name: '',
            qty: '',
            unit: '',
            note: '',
            is_active: true
        });
        setSelectedIngredientId(null);
        setShowActionModal(true);
    };

    const openUpdateModal = (item) => {
        setActionType('UPDATE');
        setFormData({
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            note: item.note || '',
            is_active: item.is_active
        });
        setSelectedIngredientId(item.id || item._id);
        setShowActionModal(true);
    };

    const closeActionModal = () => {
        setShowActionModal(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        
        const url = actionType === 'ADD' ? '/api/ingredient' : `/api/ingredient/${selectedIngredientId}`;
        const method = actionType === 'ADD' ? 'POST' : 'PUT';

        setActionLoading(true);
        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    qty: Number(formData.qty)
                })
            });

            if (res.ok) {
                toast.success(actionType === 'ADD' ? 'Thêm nguyên liệu thành công' : 'Cập nhật nguyên liệu thành công');
                closeActionModal();
                getData(searchTerm); // Refresh table
            } else {
                const data = await res.json();
                toast.error(data.message || 'Có lỗi xảy ra khi lưu nguyên liệu');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi kết nối máy chủ');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <section className="block-ingredient-staff">
            <h3 className="title-admin">Quản lý nguyên liệu</h3>
            <div className="ingredient-container background-radius">
                <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
                    <div className="ingredient-add mb-0">
                        <button className="btn-add-modal border-0 px-3 py-2 text-white bg-success rounded-3 shadow-sm" onClick={openAddModal}> + Thêm nguyên liệu</button>
                    </div>
                
                    <div className="search-container" style={{ width: '380px' }}>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <i className="fa fa-search text-muted"></i>
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm nguyên liệu..."
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
                
                {loading && ingredients.length === 0 && !isSearching ? (
                    <div className="text-center py-5">
                       <span className="spinner-border text-success" role="status"></span>
                       <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        <Table className='ingredient-table'>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tên nguyên liệu</th>
                                    <th>Số lượng</th>
                                    <th>Đơn vị</th>
                                    <th>Ghi chú</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length > 0 ? currentItems.map((item, index) => {
                                    const id = item.id || item._id;
                                    return (
                                        <tr key={id}>
                                            <td>{indexOfFirstItem + index + 1}</td>
                                            <td className="fw-medium">{item.name}</td>
                                            <td><span className="badge rounded-pill bg-light text-dark px-3 py-2 border">{item.qty}</span></td>
                                            <td>{item.unit}</td>
                                            <td>{item.note || '-'}</td>
                                            <td>
                                                <span className={`ingredient-status ${item.is_active ? 'active' : 'inactive'}`}>
                                                    {item.is_active ? 'Hoạt động' : 'Đã khóa'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-icon" onClick={() => openUpdateModal(item)}>
                                                    <FaRegEdit className='icon-update' />
                                                </button>
                                                <button className="btn-icon" onClick={() => handleDeleteItem(id)}>
                                                    <MdDelete className='icon-delete' />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted">Không có dữ liệu nguyên liệu</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>

                        <div className="pagination d-flex justify-content-center mt-3 gap-2">
                            <button
                                className="btn btn-secondary"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Prev
                            </button>

                            {totalPages > 0 && [...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                className="btn btn-secondary"
                                disabled={currentPage >= totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}

                {/* Add/Update Modal */}
                {showActionModal && createPortal(
                    <div className="custom-global-modal-overlay" onMouseDown={(e) => handleBackdropClick(e, closeActionModal)}>
                        <div className="custom-global-modal-content action-modal border-0" ref={actionModalRef}>
                            <h4 className="modal-header-title">
                                {actionType === 'ADD' ? 'Thêm nguyên liệu mới' : 'Cập nhật nguyên liệu'}
                            </h4>

                            <form onSubmit={handleActionSubmit} className="modal-body-scroll modal-form d-flex flex-column">
                                <div className="modal-form-grid">
                                    <div className="form-group full-width">
                                        <label className="fw-medium mb-1">Tên nguyên liệu <span className="text-danger">*</span></label>
                                        <input required type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nhập tên nguyên liệu..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="fw-medium mb-1">Số lượng <span className="text-danger">*</span></label>
                                        <input required type="number" min="0" step="any" className="form-control" name="qty" value={formData.qty} onChange={handleInputChange} placeholder="VD: 50" />
                                    </div>
                                    <div className="form-group">
                                        <label className="fw-medium mb-1">Đơn vị đo <span className="text-danger">*</span></label>
                                        <input required type="text" className="form-control" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="VD: kg, gam, chai..." />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="fw-medium mb-1">Ghi chú chi tiết</label>
                                        <textarea className="form-control" name="note" rows="2" value={formData.note} onChange={handleInputChange} placeholder="Nhập ghi chú thêm (nếu có)..."></textarea>
                                    </div>
                                    <div className="form-group full-width d-flex flex-column">
                                        <label className="fw-medium mb-1">Trạng thái hiện tại</label>
                                        <div className="status-toggle d-flex align-items-center justify-content-between">
                                            <span className="text-muted">{formData.is_active ? 'Sẵn sàng sử dụng' : 'Đang tạm ngưng'}</span>
                                            <div className="form-check form-switch fs-5 mb-0">
                                                <input className="form-check-input pointer" type="checkbox" role="switch" name="is_active" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions pt-3 border-top mt-auto">
                                    <button type="button" className="btn btn-secondary px-4 me-3 rounded-3" onClick={closeActionModal} disabled={actionLoading}>Hủy thao tác</button>
                                    <button type="submit" className="btn btn-close-modal px-4 d-flex align-items-center" disabled={actionLoading}>
                                        {actionLoading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                                        {actionType === 'ADD' ? 'Xác nhận tạo mới' : 'Xác nhận thay đổi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </section>
    );
}

export default Ingredient;