import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Table, InputGroup, Form } from 'react-bootstrap';
import { FaRegEdit, FaSearch, FaSortAmountDownAlt, FaSortAmountUp } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { IoMdClose } from "react-icons/io";
import { toast } from 'react-toastify';
import { socket } from '../../../socket';

import './ingredient.scss';

function Ingredient() {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 6;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = ingredients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(ingredients.length / itemsPerPage);

    // Search properties
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [maxQty, setMaxQty] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
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

    const getData = async (searchQuery = searchTerm, threshold = maxQty, status = selectedStatus, order = sortOrder) => {
        try {
            setLoading(true);
            setIsSearching(true);
            const queryParams = new URLSearchParams();
            if (searchQuery) queryParams.append('search', searchQuery);
            if (threshold) queryParams.append('maxQty', threshold);
            if (status !== 'All') queryParams.append('status', status);
            if (order !== 'none') {
                queryParams.append('sortBy', 'qty');
                queryParams.append('order', order);
            }

            const url = `/api/ingredient?${queryParams.toString()}`;
            const res = await fetch(url);
            const data = await res.json();
            setIngredients(data || []);
            setCurrentPage(1);
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
        debounceTimeoutRef.current = setTimeout(() => getData(value, maxQty, selectedStatus), 500);
    };

    const handleThresholdChange = (e) => {
        const value = e.target.value;
        setMaxQty(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => getData(searchTerm, value, selectedStatus, sortOrder), 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        getData('', maxQty, selectedStatus);
    };

    useEffect(() => {
        getData(searchTerm, maxQty, selectedStatus, sortOrder);
    }, [selectedStatus]);

    useEffect(() => {
        socket.on('stock_changed', () => {
            getData(searchTerm);
        });

        return () => {
            socket.off('stock_changed');
        };
    }, [searchTerm]);

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
        <div className="staff-management block-ingredient ps-0 pt-0">
            <div className="staff-management__header d-flex justify-content-between align-items-center mb-4 mt-4 px-0">
                <h2 className="title-admin mb-0" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748', marginLeft: '0', paddingLeft: '0' }}>Quản lý Nguyên liệu
                    <style>{`.title-admin::after { display: none !important; }`}</style> </h2>
                <div className="d-flex align-items-center gap-2">
                    <Form.Select
                        value={selectedStatus}
                        onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{ width: '130px' }}
                        className="bg-white border-secondary-subtle shadow-none"
                    >
                        <option value="All">Trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Đã khóa</option>
                    </Form.Select>

                    <Form.Control
                        type="number"
                        placeholder="Số lượng dưới..."
                        value={maxQty}
                        onChange={handleThresholdChange}
                        style={{ width: '130px' }}
                        className="bg-white border-secondary-subtle shadow-none"
                    />

                    <div className="search-container" style={{ width: '300px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0 border-secondary-subtle">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm theo tên, đơn vị, ghi chú..."
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
                    <button
                        className="btn btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={() => {
                            const nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                            setSortOrder(nextOrder);
                            getData(searchTerm, maxQty, selectedStatus, nextOrder);
                        }}
                        style={{ padding: '8px 10px', borderRadius: '8px', marginLeft: '20px' }}
                        title={sortOrder === 'desc' ? "Sắp xếp: Lớn -> Bé" : "Sắp xếp: Bé -> Lớn"}
                    >
                        {sortOrder === 'asc' ? <FaSortAmountUp className="text-success" /> : <FaSortAmountDownAlt className="text-success" />}
                        Số lượng ({sortOrder === 'desc' ? "Lớn → Bé" : "Bé → Lớn"})
                    </button>
                    <button className="btn btn-success ms-3 d-flex align-items-center gap-2" onClick={openAddModal} style={{ padding: '10px 22px', borderRadius: '8px', fontWeight: '500' }}> + Thêm nguyên liệu</button>
                </div>
            </div>
            <div className="pt-0 mt-0">

                {loading && ingredients.length === 0 && !isSearching ? (
                    <div className="text-center py-5">
                        <span className="spinner-border text-success" role="status"></span>
                        <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        <Table striped bordered hover className="mt-3 text-center align-middle">
                            <thead className="table-success">
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
                                                <button className="btn btn-sm btn-link" onClick={() => openUpdateModal(item)}>
                                                    <FaRegEdit className='icon-update fs-5 text-success' />
                                                </button>
                                                <button className="btn btn-sm btn-link" onClick={() => handleDeleteItem(id)}>
                                                    <MdDelete className='icon-delete fs-5 text-danger' />
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

                        <div className="admin-pagination">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Prev
                            </button>

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

                            <button
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
                                                <input className="form-check-input pointer" type="checkbox" role="switch" name="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
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
        </div>
    );
}

export default Ingredient;