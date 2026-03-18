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
                                                <button onClick={() => setViewingRow(null)}>
                                                    Đóng
                                                </button>
                                            </div>
                                        ) : (
                                            <button
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
                </Table>{showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h4>Thành phần sản phẩm</h4>

                            {ingredients.length > 0 ? (
                                <table className="modal-table">
                                    <thead>
                                        <tr>
                                            <th>Tên</th>
                                            <th>Số lượng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map((ing) => (
                                            <tr key={ing._id}>
                                                <td>{ing.ingredient_id?.name}</td>
                                                <td>{ing.quantity} {ing.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>Không có thành phần</p>
                            )}

                            <div className="modal-actions">
                                <button onClick={() => setShowModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Prev
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            className={currentPage === i + 1 ? 'active' : ''}
                            onClick={() => setCurrentPage(i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
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