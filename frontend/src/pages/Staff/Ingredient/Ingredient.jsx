import React, { useEffect, useState } from 'react';
import { fetchIngredients } from '../../../actions/ingredient';
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

    useEffect(() => {
        const getData = async () => {
            try {
                setLoading(true);
                const res = await fetchIngredients();
                const data = await res.json();

                setIngredients(data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        getData();
    }, []);

    if (loading) return <p>Loading...</p>;

    return (
        <div className="ingredient">
            <h3>Quản lý nguyên liệu</h3>

            {ingredients.length === 0 ? (
                <p>Không có dữ liệu</p>
            ) : (
                <table className="ingredient__table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tên</th>
                            <th>Số lượng</th>
                            <th>Đơn vị</th>
                            <th>Ghi chú</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>

                    <tbody>
                        {currentItems.map((item, index) => (
                            <tr key={item._id}>
                                <td>{indexOfFirstItem + index + 1}</td>

                                <td>{item.name}</td>

                                <td>{item.qty}</td>

                                <td>{item.unit}</td>

                                <td>{item.note || '-'}</td>

                                <td>
                                    <span className={`status ${item.is_active ? 'active' : 'inactive'}`}>
                                        {item.is_active ? 'Hoạt động' : 'Ngưng'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

    );
}

export default Ingredient;