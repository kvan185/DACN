import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaRegEdit } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

import './product.scss';

function Product(props) {
    const [productList, setProductList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = import.meta.env.VITE_ITEMS_PER_PAGE || 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = productList.slice(indexOfFirstItem, indexOfLastItem);
    const [editingRow, setEditingRow] = useState(null);
    const [newIngredient, setNewIngredient] = useState('');
    const [viewingRow, setViewingRow] = useState(null);
    const [ingredients, setIngredients] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const totalPages = Math.ceil(productList.length / itemsPerPage);
    const fetchListProduct = async () => {
        const response = await fetch('/api/product');
        const data = await response.json();

        if (data && data.length > 0) setProductList(data);
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
    }, []);

    const handleDeleteProItem = async (proId) => {
        const result = confirm('Bạn có muốn xóa');

        if (result && proId) {
            await fetchDelete(proId);
            await fetchListProduct();
        }
    }

    const fetchDelete = async (proId) => {
        const response = await fetch(`/api/product/${proId}`, {
            method: 'delete',
        });
        const data = await response.json();
        return data;
    }

    return (
        <section className="block-product-staff">
            <h3 className="title-admin">Danh sách sản phẩm</h3>
            <div className="product-container background-radius">
                <div className="product-add">
                    <Link to='/staff/product/add'> + Thêm mới</Link>
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
                        {currentProducts.map((proItem, index) => {
                            const { id, name, image, price, is_active } = proItem;

                            return (
                                <tr key={id}>
                                    <td>{indexOfFirstItem + index + 1}</td>

                                    <td>{name}</td>

                                    <td>
                                        <img src={import.meta.env.VITE_API_URL + '/static/images/' + image} alt="" />
                                    </td>

                                    <td>
                                        {price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                    </td>

                                    <td>
                                        <span className={`product-status ${is_active ? 'active' : 'inactive'}`}>
                                            {is_active ? 'active' : 'inactive'}
                                        </span>
                                    </td>

                                    <td>
                                        {viewingRow === id ? (
                                            <div>
                                                <button 
                                                    className="btn btn-secondary px-4 py-2"
                                                    onClick={() => setViewingRow(null)}
                                                >
                                                    Đóng
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-info btn-sm text-white"
                                                onClick={() => {
                                                    setSelectedProduct(proItem);
                                                    setShowModal(true);
                                                    fetchIngredientsByProduct(id);
                                                }}
                                            >
                                                Xem
                                            </button>
                                        )}
                                    </td>

                                    <td>
                                        <Link to={`/staff/product/update/${id}`}>
                                            <FaRegEdit className='icon-update' />
                                        </Link>

                                        <MdDelete
                                            onClick={() => handleDeleteProItem(id)}
                                            className='icon-delete'
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content border-0 shadow">
                            <h4 className="mb-4 text-center" style={{ color: '#007bff', fontWeight: 'bold' }}>Thành phần sản phẩm</h4>

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
                                                        <span className="badge bg-primary px-3 py-2" style={{ fontSize: '0.9rem' }}>
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

                            <div className="modal-actions text-center mt-4">
                                <button className="btn btn-secondary px-4 py-2" onClick={() => setShowModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="pagination d-flex justify-content-center mt-3 gap-2">
                    <button
                        className="btn btn-secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Prev
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
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
                        disabled={currentPage === totalPages}
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