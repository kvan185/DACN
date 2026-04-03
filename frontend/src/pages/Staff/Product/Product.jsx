import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Table, InputGroup, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaRegEdit, FaSearch } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { IoMdClose } from "react-icons/io";
import { toast } from 'react-toastify';

import './product.scss';

function Product(props) {
    const [productList, setProductList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Search properties
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef(null);

    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = productList.slice(indexOfFirstItem, indexOfLastItem);
    
    // Ingredient Modal States
    const [showIngredientModal, setShowIngredientModal] = useState(false);
    const [ingredients, setIngredients] = useState([]);
    const ingredientModalRef = useRef(null);

    // Action (Add/Update) Modal States
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState('ADD'); // 'ADD' | 'UPDATE'
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [currentImage, setCurrentImage] = useState('');
    const actionModalRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: '',
        detail: '',
        is_active: true,
        image: null
    });

    useEffect(() => {
        // Prevent body scroll when any modal is open
        if (showIngredientModal || showActionModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showIngredientModal, showActionModal]);

    const handleBackdropClick = (e, closeModalFunc) => {
        // Only close if the click is exactly on the overlay background, not on modal content
        if (e.target === e.currentTarget) {
            closeModalFunc();
        }
    };

    const totalPages = Math.ceil(productList.length / itemsPerPage);
    
    const fetchListProduct = async (searchQuery = '') => {
        setIsSearching(true);
        try {
            const url = searchQuery ? `/api/product?search=${encodeURIComponent(searchQuery)}` : '/api/product';
            const response = await fetch(url);
            const data = await response.json();
            setProductList(data || []);
            if (searchQuery) setCurrentPage(1);
        } catch (error) {
            console.error('Fetch products error:', error);
        } finally {
            setIsSearching(false);
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/category');
            const data = await res.json();
            if (data) setCategories(data);
        } catch (error) {
            console.error('Fetch categories error:', error);
        }
    }

    const fetchIngredientsByProduct = async (productId) => {
        try {
            const res = await fetch(`/api/productBom/product/${productId}`);
            const data = await res.json();
            setIngredients(data || []);
        } catch (error) {
            console.error(error);
            setIngredients([]);
        }
    };

    useEffect(() => {
        fetchListProduct();
        fetchCategories();
    }, []);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            fetchListProduct(value);
        }, 500);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        fetchListProduct('');
    };

    const handleDeleteProItem = async (proId) => {
        const result = window.confirm('Bạn có muốn xóa sản phẩm này?');

        if (result && proId) {
            try {
                const response = await fetch(`/api/product/${proId}`, { method: 'delete' });
                if (response.ok) {
                    toast.success('Xóa sản phẩm thành công');
                    await fetchListProduct(searchTerm);
                } else {
                    toast.error('Lỗi khi xóa sản phẩm');
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
            category_id: '',
            price: '',
            detail: '',
            is_active: true,
            image: null
        });
        setCurrentImage('');
        setSelectedProductId(null);
        setShowActionModal(true);
    };

    const openUpdateModal = (product) => {
        setActionType('UPDATE');
        setFormData({
            name: product.name,
            category_id: product.category_id,
            price: product.price,
            detail: product.detail || '',
            is_active: product.is_active,
            image: null
        });
        setCurrentImage(product.image);
        setSelectedProductId(product.id || product._id);
        setShowActionModal(true);
    };

    const closeActionModal = () => {
        setShowActionModal(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, image: e.target.files[0] }));
        }
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        
        if (actionType === 'ADD' && !formData.image) {
            toast.warn('Vui lòng chọn hình ảnh sản phẩm');
            return;
        }

        const formDataObj = new FormData();
        formDataObj.append('name', formData.name);
        formDataObj.append('category_id', formData.category_id);
        formDataObj.append('price', formData.price);
        formDataObj.append('detail', formData.detail);
        formDataObj.append('is_active', formData.is_active);
        
        if (formData.image) {
            formDataObj.append('image', formData.image);
        }

        const url = actionType === 'ADD' ? '/api/product' : `/api/product/${selectedProductId}`;
        const method = actionType === 'ADD' ? 'POST' : 'PUT';

        setActionLoading(true);
        try {
            const res = await fetch(url, {
                method,
                body: formDataObj
            });

            if (res.ok) {
                toast.success(actionType === 'ADD' ? 'Thêm sản phẩm thành công' : 'Cập nhật sản phẩm thành công');
                closeActionModal();
                fetchListProduct(searchTerm);
            } else {
                const data = await res.json();
                toast.error(data.message || 'Có lỗi xảy ra khi lưu sản phẩm');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi kết nối máy chủ');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <section className="block-product-staff">
            <h3 className="title-admin">Danh sách sản phẩm</h3>
            <div className="product-container background-radius">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="product-add mb-0">
                        <button className="btn-add-modal" onClick={openAddModal}> + Thêm mới</button>
                    </div>

                    <div className="search-container" style={{ width: '380px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm kiếm theo Tên hoặc Mã sản phẩm..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="border-start-0 border-end-0 shadow-none"
                            />
                            {searchTerm && (
                                <InputGroup.Text 
                                    className="bg-white border-start-0 cursor-pointer" 
                                    onClick={handleClearSearch}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <IoMdClose className="text-secondary" />
                                </InputGroup.Text>
                            )}
                        </InputGroup>
                    </div>
                </div>

                <Table className='product-table'>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th>Hình ảnh</th>
                            <th>Giá sản phẩm</th>
                            <th>Trạng thái</th>
                            <th>Xem thành phần</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isSearching ? (
                            <tr>
                                <td colSpan="7" className="text-center py-4">Đang tìm kiếm...</td>
                            </tr>
                        ) : currentProducts.length > 0 ? (
                            currentProducts.map((proItem, index) => {
                                const { id, _id, name, image, price, is_active } = proItem;
                                const productId = id || _id;

                                return (
                                    <tr key={productId}>
                                        <td>{indexOfFirstItem + index + 1}</td>
                                        <td>{name}</td>
                                        <td>
                                            <img src={import.meta.env.VITE_API_URL + '/static/images/' + image} alt={name} width="60" />
                                        </td>
                                        <td>
                                            {price?.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                        </td>
                                        <td>
                                            <span className={`product-status ${is_active ? 'active' : 'inactive'}`}>
                                                {is_active ? 'Hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-info btn-sm text-white"
                                                onClick={() => {
                                                    setShowIngredientModal(true);
                                                    fetchIngredientsByProduct(productId);
                                                }}
                                            >
                                                Xem
                                            </button>
                                        </td>
                                        <td>
                                            <button className="btn-icon" onClick={() => openUpdateModal(proItem)}>
                                                <FaRegEdit className='icon-update text-success' />
                                            </button>
                                            <button className="btn-icon" onClick={() => handleDeleteProItem(productId)}>
                                                <MdDelete className='icon-delete text-danger' />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-4 text-muted">Không tìm thấy sản phẩm nào!</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                
                {/* Ingredient Modal */}
                {showIngredientModal && createPortal(
                    <div className="custom-global-modal-overlay" onMouseDown={(e) => handleBackdropClick(e, () => setShowIngredientModal(false))}>
                        <div className="custom-global-modal-content border-0" ref={ingredientModalRef}>
                            <h4 className="modal-header-title">Thành phần sản phẩm</h4>

                            <div className="modal-body-scroll">
                                {ingredients.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table table-hover table-bordered modal-table mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="text-center align-middle">Tên nguyên liệu</th>
                                                    <th className="text-center align-middle">Số lượng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ingredients.map((ing) => (
                                                    <tr key={ing._id}>
                                                        <td className="align-middle fw-medium">{ing.ingredient_id?.name}</td>
                                                        <td className="text-center align-middle">
                                                            <span className="badge quantity-badge">
                                                                {ing.quantity} {ing.unit}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted">Không có thành phần</div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button className="btn-close-modal" onClick={() => setShowIngredientModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Add/Update Product Modal */}
                {showActionModal && createPortal(
                    <div className="custom-global-modal-overlay" onMouseDown={(e) => handleBackdropClick(e, closeActionModal)}>
                        <div className="custom-global-modal-content action-modal border-0" ref={actionModalRef}>
                            <h4 className="modal-header-title">
                                {actionType === 'ADD' ? 'Thêm sản phẩm mới' : 'Cập nhật sản phẩm'}
                            </h4>

                            <form onSubmit={handleActionSubmit} className="modal-body-scroll modal-form d-flex flex-column">
                                <div className="modal-form-grid">
                                    <div className="form-group">
                                        <label className="fw-medium mb-1">Tên sản phẩm <span className="text-danger">*</span></label>
                                        <input required type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nhập tên..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="fw-medium mb-1">Danh mục <span className="text-danger">*</span></label>
                                        <select required className="form-select" name="category_id" value={formData.category_id} onChange={handleInputChange}>
                                            <option value="">-- Chọn danh mục --</option>
                                            {categories.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="fw-medium mb-1">Giá sản phẩm (VNĐ) <span className="text-danger">*</span></label>
                                        <input required type="number" min="0" className="form-control" name="price" value={formData.price} onChange={handleInputChange} placeholder="VD: 50000" />
                                    </div>
                                    <div className="form-group d-flex flex-column">
                                        <label className="fw-medium mb-1">Trạng thái hoạt động</label>
                                        <div className="status-toggle d-flex align-items-center justify-content-between">
                                            <span className="text-muted">{formData.is_active ? 'Đang hoạt động' : 'Tạm khóa'}</span>
                                            <div className="form-check form-switch fs-5 mb-0">
                                                <input className="form-check-input pointer" type="checkbox" role="switch" name="is_active" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="fw-medium mb-1">Hình ảnh {actionType === 'ADD' && <span className="text-danger">*</span>}</label>
                                        <input type="file" accept="image/*" className="form-control" onChange={handleFileChange} />
                                        {currentImage && actionType === 'UPDATE' && !formData.image && (
                                            <div className="mt-2 img-preview-container">
                                                <img src={`${import.meta.env.VITE_API_URL}/static/images/${currentImage}`} alt="Current Preview" height="70" />
                                                <span className="text-muted fs-6">Ảnh hiện tại đang sử dụng</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="fw-medium mb-1">Mô tả chi tiết</label>
                                        <textarea className="form-control" name="detail" rows="2" value={formData.detail} onChange={handleInputChange} placeholder="Nhập mô tả sản phẩm (nếu có)..."></textarea>
                                    </div>
                                </div>

                                <div className="modal-actions pt-3 border-top mt-auto">
                                    <button type="button" className="btn btn-secondary px-4 me-3 rounded-3" onClick={closeActionModal} disabled={actionLoading}>Hủy</button>
                                    <button type="submit" className="btn btn-close-modal px-4 d-flex align-items-center" disabled={actionLoading}>
                                        {actionLoading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                                        {actionType === 'ADD' ? 'Thêm mới' : 'Lưu cập nhật'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

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
            </div>
        </section>
    );
}

export default Product;