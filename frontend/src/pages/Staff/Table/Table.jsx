import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Button, Table, Modal, Form } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketIOClient from 'socket.io-client';
import './table.scss';
import { completeReservation } from '../../../actions/table.js';
import { Table as AntTable, Tag } from 'antd';

const TableManagement = () => {
    const [tables, setTables] = useState([]);
    const accessToken = sessionStorage.getItem("accessToken");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [newTable, setNewTable] = useState({
        tableNumber: '',
        seatingCapacity: 1,
        location: 'Tầng 1 trong nhà',
        isAvailable: true
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 10;

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const filteredTables = useMemo(() => {
        return tables.filter(table => {
            // Lọc theo trạng thái trước tiên
            if (statusFilter !== 'Tất cả') {
                if (statusFilter === 'Trống' && table.status !== 'Trống') return false;
                if (statusFilter === 'Đã đặt' && table.status !== 'Đã đặt') return false;
                if (statusFilter === 'Đang sử dụng' && table.status !== 'Đang sử dụng') return false;
            }

            // Nếu không có từ khóa tìm kiếm, hiển thị tất cả (đã qua bộ lọc trạng thái)
            if (!debouncedSearch) return true;

            const lowerSearch = debouncedSearch.toLowerCase().trim();
            const isNumeric = /^\d+$/.test(lowerSearch);

            if (isNumeric) {
                return String(table.tableNumber).includes(lowerSearch) ||
                    String(table.seatingCapacity).includes(lowerSearch);
            } else {
                // Tìm trong danh sách tất cả mã đặt bàn của bàn này từ aggregate
                const codes = (table.reservationList || []).map(r => (r.confirmationCode || '').toLowerCase());

                // Nếu backend chưa trả code ở list, fall-back sang code hiện tại
                if (table.confirmationCode) {
                    codes.push(table.confirmationCode.toLowerCase());
                }

                return codes.some(code => code.includes(lowerSearch));
            }
        });
    }, [tables, debouncedSearch, statusFilter]);

    useEffect(() => {
        // Debugging log để check field reservationList
        if (tables.length > 0) {
            console.log("Check data Backend gửi:", tables[0]);
        }
        setCurrentPage(1);
    }, [debouncedSearch]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTables = filteredTables.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewTable, setViewTable] = useState(null);
    const [reservationInfo, setReservationInfo] = useState(null);
    const [allReservations, setAllReservations] = useState([]);
    const [socketTables, setSocketTables] = useState([]);
    const socketRef = useRef();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const [now, setNow] = useState(new Date());
    const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const CLIENT_URL = window.location.origin;

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        socketRef.current = socketIOClient.connect(SOCKET_SERVER_URL);
        socketRef.current.emit('adminConnect', user.id);

        socketRef.current.on('tableUpdated', (updatedTables) => {
            setSocketTables(updatedTables);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        fetchTables();
    }, [socketTables]);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/tables');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setTables(data);
        } catch (error) {
            setError('Lỗi khi tải danh sách bàn: ' + error.message);
            console.error("Error fetching tables:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseAddModal = () => setShowAddModal(false);
    const handleShowAddModal = () => setShowAddModal(true);

    const handleDeleteTable = async (tableId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa bàn này?')) {
            try {
                const response = await fetch(`/api/tables/${tableId}`, { method: 'DELETE' });
                if (!response.ok) {
                    throw new Error('Lỗi khi xóa bàn');
                }
                fetchTables();
                toast.success('Xóa bàn thành công!');
            } catch (error) {
                toast.error('Lỗi khi xóa bàn: ' + error.message);
                console.error("Error deleting table:", error);
            }
        }
    }

    const handleShowEditModal = (table) => {
        setSelectedTable(table);
        setShowEditModal(true);
    }

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedTable(null);
    }

    const handleEditTable = async () => {
        try {
            const response = await fetch(`/api/tables/${selectedTable._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedTable),
            });

            if (!response.ok) {
                throw new Error('Lỗi khi cập nhật bàn');
            }

            handleCloseEditModal();
            fetchTables();
            toast.success('Cập nhật bàn thành công!');
        } catch (error) {
            toast.error('Lỗi khi cập nhật bàn: ' + error.message);
            console.error("Error editing table:", error);
        }
    }

    const handleAddTable = async () => {
        try {
            const response = await fetch('/api/tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newTable),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            handleCloseAddModal();
            setNewTable({
                tableNumber: '',
                seatingCapacity: '',
                location: 'Tầng 1 trong nhà',
                isAvailable: true
            });
            fetchTables();
            emitTableChange();
            toast.success('Thêm bàn mới thành công!');

        } catch (error) {
            toast.error('Lỗi khi thêm bàn: ' + error.message);
            console.error("Error adding table:", error);
        }
    };

    const fetchReservationInfo = async (tableId) => {
        try {
            const response = await fetch(`/api/reservations/${tableId}`);
            if (!response.ok) {
                throw new Error('Không thể lấy thông tin đặt bàn');
            }
            const data = await response.json();

            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const localISO = new Date(Date.now() - tzoffset).toISOString().split('T')[0];

            let todayRes = null;
            if (Array.isArray(data)) {
                setAllReservations(data);
                todayRes = data.find(r => r.use_date.startsWith(localISO) && r.status !== 'Đã hủy' && r.status !== 'Hoàn thành' && r.status !== 'Đã hoàn thành');
            } else {
                setAllReservations([]);
                todayRes = data;
            }
            setReservationInfo(todayRes);
        } catch (error) {
            console.error("Error fetching reservation:", error);
            setReservationInfo(null);
        }
    };

    const handleShowViewModal = (table) => {
        setViewTable(table);
        setShowViewModal(true);
        fetchReservationInfo(table._id);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setViewTable(null);
    };

    const handleCompleteReservation = async (tableId) => {
        if (window.confirm('Bạn có chắc chắn muốn đánh dấu bàn này là đã hoàn thành?')) {
            try {
                await completeReservation(accessToken, tableId);

                fetchTables();
                emitTableChange();
                toast.success('Cập nhật trạng thái bàn thành công!');
            } catch (error) {
                toast.error('Lỗi khi cập nhật trạng thái bàn: ' + error.message);
                console.error("Error completing reservation:", error);
            }
        }
    };

    const emitTableChange = () => {
        socketRef.current.emit('tableChange');
    };

    const handleDeleteReservation = async (tableId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa đặt bàn này?')) {
            try {
                await completeReservation(accessToken, tableId);

                fetchTables();
                emitTableChange();
                toast.success('Cập nhật trạng thái bàn thành công!');
            } catch (error) {
                toast.error('Lỗi khi cập nhật trạng thái bàn: ' + error.message);
                console.error("Error completing reservation:", error);
            }
        }
    };

    const handleStartUsingTable = async (table) => {
        const tableId = table._id;
        let confirmMessage = 'Xác nhận chuyển trạng thái bàn sang đang sử dụng?';

        if (table.status === 'Đã đặt' && table.note === 'Bàn đang giữ chỗ') {
            confirmMessage = 'Bàn này đang được giữ chỗ cho khách sắp đến. Bạn có chắc chắn muốn bắt đầu sử dụng không?';
        }

        if (window.confirm(confirmMessage)) {
            try {
                const response = await fetch(`/api/tables/${tableId}/start-using`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Lỗi khi cập nhật trạng thái bàn');
                }

                fetchTables();
                emitTableChange();
                toast.success('Đã chuyển trạng thái bàn sang đang sử dụng!');
            } catch (error) {
                toast.error('Lỗi khi cập nhật trạng thái: ' + error.message);
            }
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Trống':
                return 'bg-success px-3 py-2 rounded-pill';
            case 'Đã đặt':
                return 'bg-warning text-dark px-3 py-2 rounded-pill';
            case 'Đang sử dụng':
                return 'bg-danger px-3 py-2 rounded-pill';
            default:
                return 'bg-secondary px-3 py-2 rounded-pill';
        }
    };

    const renderCountdown = (targetTime) => {
        const diff = new Date(targetTime) - now;
        if (diff <= 0) return <span className="text-danger fw-bold">Hết giờ!</span>;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return (
            <span className="countdown-timer text-danger fw-bold">
                {hours > 0 ? `${hours}:` : ''}{minutes < 10 ? '0' : ''}{minutes}:{seconds < 10 ? '0' : ''}{seconds}
            </span>
        );
    };

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="table-management">
            <span className="date-text">
                {new Date().toLocaleDateString('vi-VN')}
            </span>
            <div className="table-management__header d-flex justify-content-between align-items-center">
                <h1>Quản lý bàn</h1>
                <div className="d-flex align-items-center gap-2">
                    <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ width: '160px' }}
                    >
                        <option value="Tất cả">Tất cả trạng thái</option>
                        <option value="Trống">Trống</option>
                        <option value="Đã đặt">Đã đặt</option>
                        <option value="Đang sử dụng">Đang sử dụng</option>
                    </Form.Select>
                    <Form.Control
                        type="text"
                        placeholder="Tìm theo số bàn, mã đặt bàn..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                setDebouncedSearch(searchTerm);

                                // Nếu có search term thì mở modal kết quả đầu tiên ngay lập tức
                                const lowerSearch = searchTerm.toLowerCase().trim();
                                if (!lowerSearch) return;

                                const isNumeric = /^\d+$/.test(lowerSearch);
                                const instantMatch = tables.filter(table => {
                                    if (statusFilter !== 'Tất cả' && table.status !== statusFilter) return false;

                                    if (isNumeric) {
                                        return String(table.tableNumber).includes(lowerSearch) ||
                                            String(table.seatingCapacity).includes(lowerSearch);
                                    } else {
                                        const codes = (table.reservationList || []).map(r => (r.confirmationCode || '').toLowerCase());
                                        if (table.confirmationCode) codes.push(table.confirmationCode.toLowerCase());
                                        return codes.some(code => code.includes(lowerSearch));
                                    }
                                });

                                if (instantMatch.length > 0) {
                                    handleShowViewModal(instantMatch[0]);
                                }
                            }
                        }}
                        style={{ width: '280px' }}
                    />
                    <Button className="btn-add ms-3" onClick={handleShowAddModal}>Thêm bàn</Button>
                </div>
            </div>

            <ToastContainer
                position="top-right"
                autoClose={1000}
            />

            {/* Modal Thêm */}
            <Modal show={showAddModal} onHide={handleCloseAddModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Thêm bàn</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Số bàn</Form.Label>
                            <Form.Control
                                type="text"
                                value={newTable.tableNumber}
                                onChange={e => setNewTable({
                                    ...newTable,
                                    tableNumber: e.target.value
                                })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Sức chứa</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                value={newTable.seatingCapacity}
                                onChange={e => setNewTable({
                                    ...newTable,
                                    seatingCapacity: Math.max(1, parseInt(e.target.value) || 1)
                                })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Vị trí</Form.Label>
                            <Form.Select
                                value={newTable.location}
                                onChange={e => setNewTable({
                                    ...newTable,
                                    location: e.target.value
                                })}
                                required
                            >
                                <option value="Tầng 1 trong nhà">Tầng 1 trong nhà</option>
                                <option value="Tầng 2 trong nhà">Tầng 2 trong nhà</option>
                                <option value="Tầng 1 ngoài trời">Tầng 1 ngoài trời</option>
                                <option value="Tầng 2 ngoài trời">Tầng 2 ngoài trời</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Có sẵn"
                                checked={newTable.isAvailable}
                                onChange={e => setNewTable({
                                    ...newTable,
                                    isAvailable: e.target.checked
                                })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseAddModal}>
                        Đóng
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddTable}
                        disabled={!newTable.tableNumber || !newTable.seatingCapacity}
                    >
                        Lưu
                    </Button>
                </Modal.Footer>
            </Modal>

            {loading ? (
                <div className="text-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="alert alert-info text-center mt-4">
                    Không tìm thấy dữ liệu
                </div>
            ) : (
                <>
                    <Table striped bordered hover className="mt-3">
                        <thead>
                            <tr>
                                <th>Số bàn</th>
                                <th>Trạng thái</th>
                                <th>Sức chứa</th>
                                <th>Hành động</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTables.map((table) => {
                                // Helper to highlight matched text safely
                                const highlight = (text, isNumberField = false) => {
                                    if (!text) return text;
                                    const term = debouncedSearch.trim();
                                    if (!term) return text;

                                    const searchIsNum = /^\d+$/.test(term);
                                    if (isNumberField && !searchIsNum) return text;
                                    if (!isNumberField && searchIsNum) return text;

                                    const strText = String(text);
                                    const regex = new RegExp(`(${term})`, 'gi');
                                    const parts = strText.split(regex);
                                    return parts.map((part, i) =>
                                        part.toLowerCase() === term.toLowerCase()
                                            ? <mark key={i} style={{ backgroundColor: '#ffc107', padding: 0 }}>{part}</mark>
                                            : part
                                    );
                                };

                                return (
                                    <tr key={table._id}>
                                        <td>Bàn {highlight(table.tableNumber, true)}</td>
                                        <td>
                                            <div className="d-flex flex-column align-items-center">
                                                <span className={`badge ${getStatusBadgeClass(table.status)}`}>
                                                    {table.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{highlight(table.seatingCapacity, true)}</td>
                                        <td>
                                            <Button
                                                variant="info"
                                                size="sm"
                                                onClick={() => handleShowViewModal(table)}
                                                className="me-2"
                                            >
                                                Xem
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleShowEditModal(table)}
                                                className="me-2"
                                            >
                                                Sửa
                                            </Button>
                                            {(table.status === 'Trống' || table.status === 'Đã đặt') && (
                                                <>
                                                    <Button
                                                        variant="warning"
                                                        size="sm"
                                                        onClick={() => handleStartUsingTable(table)}
                                                        className="me-2"
                                                    >
                                                        Bắt đầu sử dụng
                                                    </Button>

                                                </>
                                            )}
                                            {(table.status === 'Đang sử dụng') && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleCompleteReservation(table._id)}
                                                    className="me-2"
                                                >
                                                    Hoàn thành
                                                </Button>
                                            )}
                                            {(table.status === 'Đã đặt') && (
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteReservation(table._id)}
                                                    className="me-2"
                                                >
                                                    Xóa đặt bàn
                                                </Button>
                                            )}
                                        </td>
                                        <td>
                                            <div className="d-flex flex-column">
                                                <span style={{ color: '#6c757d', fontSize: '14px' }}>
                                                    {table.note}
                                                    {table.confirmationCode && (
                                                        <span className="d-block mt-1">
                                                            Mã đặt: <strong>{highlight(table.confirmationCode, false)}</strong>
                                                        </span>
                                                    )}
                                                </span>
                                                {table.nextReservationTime && (
                                                    <div className="mt-1" style={{ fontSize: '14px' }}>
                                                        {renderCountdown(table.note === 'Bàn đang giữ chỗ' ? table.holdExpiryTime : table.nextReservationTime)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
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
                </>
            )}

            {/* Modal Sửa */}
            <Modal show={showEditModal} onHide={handleCloseEditModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Sửa bàn</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTable && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Số bàn</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={selectedTable.tableNumber}
                                    onChange={e => setSelectedTable({
                                        ...selectedTable,
                                        tableNumber: e.target.value
                                    })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Sức chứa</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    value={selectedTable.seatingCapacity}
                                    onChange={e => setSelectedTable({
                                        ...selectedTable,
                                        seatingCapacity: Math.max(1, parseInt(e.target.value) || 1)
                                    })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Vị trí</Form.Label>
                                <Form.Select
                                    value={selectedTable.location}
                                    onChange={e => setSelectedTable({
                                        ...selectedTable,
                                        location: e.target.value
                                    })}
                                    required
                                >
                                    <option value="Tầng 1 trong nhà">Tầng 1 trong nhà</option>
                                    <option value="Tầng 2 trong nhà">Tầng 2 trong nhà</option>
                                    <option value="Tầng 1 ngoài trời">Tầng 1 ngoài trời</option>
                                    <option value="Tầng 2 ngoài trời">Tầng 2 ngoài trời</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Có sẵn"
                                    checked={selectedTable.isAvailable}
                                    onChange={e => setSelectedTable({
                                        ...selectedTable,
                                        isAvailable: e.target.checked
                                    })}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseEditModal}>
                        Đóng
                    </Button>
                    <Button variant="primary" onClick={handleEditTable}>
                        Lưu
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Xem Chi Tiết */}
            <Modal show={showViewModal} onHide={handleCloseViewModal} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Chi tiết bàn</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewTable && (
                        <Row className="table-details">
                            <Col md={5} className="d-flex flex-column">
                                <div className="info-section">
                                    <h5>Thông tin bàn</h5>
                                    <p><strong>Số bàn:</strong> Bàn {viewTable.tableNumber}</p>
                                    <p><strong>Trạng thái:</strong> {viewTable.status}</p>
                                    <p><strong>Sức chứa:</strong> {viewTable.seatingCapacity} người</p>
                                    <p><strong>Vị trí:</strong> {viewTable.location}</p>
                                </div>

                                <div className="qr-section mt-1">
                                    <h5>Mã QR</h5>
                                    <div className="d-flex justify-content-center">
                                        <QRCodeSVG
                                            value={`${CLIENT_URL}/menu?table=${viewTable.tableNumber}`}
                                            size={180}
                                            level="H"
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions mt-auto pt-3 d-flex justify-content-center gap-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-fill"
                                        onClick={handleCloseViewModal}
                                        style={{ height: '38px', fontSize: '14px' }}
                                    >
                                        Đóng
                                    </Button>
                                    <Button
                                        variant="danger"
                                        className="flex-fill"
                                        onClick={() => {
                                            handleDeleteTable(viewTable._id);
                                            handleCloseViewModal();
                                        }}
                                        style={{ height: '38px', fontSize: '14px' }}
                                    >
                                        Xóa bàn
                                    </Button>
                                </div>
                            </Col>

                            <Col md={7}>
                                <div className="reservation-schedule d-flex flex-column mt-3" style={{ minHeight: '200px', height: 'auto' }}>
                                    <h5>Lịch đặt bàn</h5>
                                    <AntTable
                                        columns={[
                                            {
                                                title: 'Mã đặt',
                                                dataIndex: 'confirmationCode',
                                                key: 'confirmationCode',
                                                align: 'center',
                                                render: (text) => (
                                                    <span style={{ fontWeight: '600', color: '#0d6efd', whiteSpace: 'nowrap' }}>
                                                        {text}
                                                    </span>
                                                )
                                            },
                                            {
                                                title: 'Khách hàng',
                                                dataIndex: 'customerName',
                                                key: 'customerName',
                                                align: 'center'
                                            },
                                            {
                                                title: 'Ngày',
                                                dataIndex: 'use_date',
                                                key: 'use_date',
                                                align: 'center',
                                                render: (text) => new Date(text).toLocaleDateString('vi-VN')
                                            },
                                            {
                                                title: 'Giờ',
                                                dataIndex: 'reservationTime',
                                                key: 'reservationTime',
                                                align: 'center',
                                                render: (text) => new Date(text).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                            },
                                            {
                                                title: 'Trạng thái',
                                                dataIndex: 'status',
                                                key: 'status',
                                                align: 'center',
                                                render: (status) => {
                                                    if (status === 'Đã đặt') {
                                                        return (
                                                            <Tag style={{
                                                                color: '#d97706',
                                                                borderColor: '#f59e0b',
                                                                background: '#fef3c7',
                                                                borderRadius: '20px',
                                                                padding: '4px 12px',
                                                                fontWeight: '600',
                                                                fontSize: '13px',
                                                                margin: 0
                                                            }}>
                                                                Đã đặt
                                                            </Tag>
                                                        );
                                                    }
                                                    if (status === 'Trống') return <Tag color="success" style={{ borderRadius: '20px', padding: '4px 12px', margin: 0 }}>Trống</Tag>;
                                                    if (status === 'Đang sử dụng') return <Tag color="error" style={{ borderRadius: '20px', padding: '4px 12px', margin: 0 }}>Đang sử dụng</Tag>;
                                                    return <Tag style={{ borderRadius: '20px', padding: '4px 12px', margin: 0 }}>{status}</Tag>;
                                                }
                                            }
                                        ]}
                                        dataSource={allReservations.map((res, index) => ({ ...res, key: res._id || index })).sort((a, b) => new Date(a.reservationTime) - new Date(b.reservationTime))}
                                        pagination={false}
                                        bordered={false}
                                        size="large"
                                        scroll={{ x: 'max-content', y: allReservations.length > 5 ? 400 : undefined }}
                                        style={{ border: '1px solid #eee', borderRadius: '8px' }}
                                        locale={{ emptyText: 'Chưa có lịch đặt' }}
                                    />
                                </div>

                                {reservationInfo && (
                                    <div className="reservation-section mt-2">
                                        <h5>Thông tin khách (Hôm nay)</h5>
                                        <p><strong>Khách hàng:</strong> {reservationInfo.customerName}</p>
                                        <p><strong>Số điện thoại:</strong> {reservationInfo.phoneNumber}</p>
                                        <p><strong>Email:</strong> {reservationInfo.email}</p>
                                        <p><strong>Số người:</strong> {viewTable.seatingCapacity} người</p>
                                        <p><strong>Giờ đặt:</strong> {new Date(reservationInfo.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p><strong>Mã xác nhận:</strong> {reservationInfo.confirmationCode}</p>
                                        {reservationInfo.specialRequests && (
                                            <p><strong>Ghi chú:</strong> {reservationInfo.specialRequests}</p>
                                        )}
                                        <p>
                                            <strong>Trạng thái:</strong>{' '}
                                            <span className={`status-badge status-${reservationInfo.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                {reservationInfo.status}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default TableManagement;