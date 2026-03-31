import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import { FaRegEdit } from 'react-icons/fa';
import { MdLock, MdLockOpen } from 'react-icons/md';
import { Link } from 'react-router-dom';
import './customer.scss';

function Customer() {
    const [customerList, setCustomerList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const itemsPerPage = parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 10;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCustomers = customerList.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(customerList.length / itemsPerPage);

    // 🔹 Lấy danh sách khách hàng
    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/customer');
            const data = await res.json();
            console.log('Fetched customers:', data); // Debug: xem cấu trúc dữ liệu

            // Kiểm tra cấu trúc dữ liệu trả về
            if (Array.isArray(data)) {
                setCustomerList(data);
            } else if (data.customers && Array.isArray(data.customers)) {
                setCustomerList(data.customers);
            } else if (data.data && Array.isArray(data.data)) {
                setCustomerList(data.data);
            } else {
                console.error('Unexpected data structure:', data);
                setCustomerList([]);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            setCustomerList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // 🔹 Khóa/Mở khóa tài khoản
    const handleToggleLock = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'banned' : 'active';
        const action = newStatus === 'banned' ? 'khóa' : 'mở khóa';

        const result = confirm(`Bạn có chắc chắn muốn ${action} tài khoản này?`);

        if (result) {
            setUpdatingId(id);
            try {
                console.log(`Toggling status for customer ${id} to ${newStatus}`);

                const res = await fetch(`/api/admin/customer/toggle-status/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                console.log('Response status:', res.status);
                const data = await res.json();
                console.log('Response data:', data);

                if (res.ok) {
                    alert(`${action} tài khoản thành công!`);

                    // ✅ CÁCH FIX: Cập nhật state trực tiếp
                    setCustomerList(prevList => {
                        const updatedList = prevList.map(customer => {
                            // So sánh bằng _id hoặc id
                            const customerId = customer._id || customer.id;
                            if (customerId === id) {
                                console.log(`Updating customer ${id} from ${customer.status} to ${newStatus}`);
                                return { ...customer, status: newStatus };
                            }
                            return customer;
                        });
                        console.log('Updated list:', updatedList);
                        return updatedList;
                    });
                } else {
                    alert(`Lỗi: ${data.message || 'Không thể thay đổi trạng thái'}`);
                }
            } catch (error) {
                console.error('Error toggling lock:', error);
                alert('Có lỗi xảy ra, vui lòng thử lại');
            } finally {
                setUpdatingId(null);
            }
        }
    };




    // Hiển thị loading
    if (loading && customerList.length === 0) {
        return (
            <section className="block-customer-admin">
                <h3 className="title-admin">Danh sách khách hàng</h3>
                <div className="customer-container background-radius">
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        Đang tải dữ liệu...
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="block-customer-admin">
            <h3 className="title-admin">Danh sách khách hàng</h3>

            <div className="customer-container background-radius">
                <div className="product-add">
                    <Link to='/staff/customer/add' className="btn-add">
                        + Thêm mới
                    </Link>
                </div>

                <Table className="customer-table">
                    <thead>
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
                                // 🔹 QUAN TRỌNG: Kiểm tra và lấy đúng ID
                                // Có thể ID nằm ở _id hoặc id
                                const customerId = cus._id || cus.id;

                                if (!customerId) {
                                    console.error('Customer missing ID:', cus);
                                    return null; // Bỏ qua customer không có ID
                                }

                                const fullName = `${cus.first_name || ''} ${cus.last_name || ''}`.trim();
                                const email = cus.email || '';
                                const phone = cus.phone || '';
                                const gender = cus.gender || '';
                                const status = cus.status || 'active';

                                const isLocked = status === 'banned' || status === 'inactive';
                                const isUpdating = updatingId === customerId;

                                return (
                                    <tr key={customerId} className={isLocked ? 'locked-row' : ''}>
                                        <td>{indexOfFirstItem + index + 1}</td>
                                        <td>{fullName}</td>
                                        <td>{email}</td>
                                        <td>{phone}</td>
                                        <td>
                                            {gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Khác'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${status}`}>
                                                {status === 'active' ? 'Hoạt động' :
                                                    status === 'banned' ? 'Đã khóa' :
                                                        status === 'inactive' ? 'Không hoạt động' : status}
                                            </span>
                                        </td>
                                        <td>
                                            {/* 🔹 Nút sửa */}
                                            <Link
                                                to={`/staff/customer/update/${customerId}`}
                                                className="icon-update-link"
                                            >
                                                <FaRegEdit
                                                    className="icon-update"
                                                    title="Chỉnh sửa"
                                                />
                                            </Link>

                                            {/* 🔹 Nút khóa/mở khóa */}
                                            {isUpdating ? (
                                                <span className="loading-spinner">...</span>
                                            ) : (
                                                <button
                                                    className={`lock-btn ${isLocked ? 'unlock' : 'lock'}`}
                                                    onClick={() => handleToggleLock(customerId, status)}
                                                    title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                                >
                                                    {isLocked ? <MdLockOpen /> : <MdLock />}
                                                    {isLocked ? ' Mở khóa' : ' Khóa'}
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
                )}
            </div>
        </section>
    );
}

export default Customer;