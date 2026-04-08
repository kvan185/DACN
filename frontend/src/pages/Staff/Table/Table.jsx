import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Button, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaRegEdit, FaSearch, FaUtensils, FaPlus, FaEye, FaEyeSlash, FaTimesCircle } from 'react-icons/fa';
import { MdDelete, MdCancel } from 'react-icons/md';
import { IoMdClose } from "react-icons/io";
import { socket } from '../../../socket.js';
import './table.scss';
import { completeReservation, cancelReservation, mergeTable, unmergeTable } from '../../../actions/table.js';
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
    const itemsPerPage = parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 6;

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
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeToTable, setMergeToTable] = useState('');
    const [socketTables, setSocketTables] = useState([]);
    const socketRef = useRef(socket);
    const user = JSON.parse(sessionStorage.getItem("user"));
    const [now, setNow] = useState(new Date());
    const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const CLIENT_URL = window.location.origin;

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClearSearch = () => {
        setSearchTerm('');
        setDebouncedSearch('');
    };

    useEffect(() => {
        if (user && user.id) {
            socketRef.current.emit('adminConnect', user.id);
        }

        const handleTableUpdated = (updatedTables) => {
            setSocketTables(updatedTables);
        };
        const handleTableMerged = (data) => {
            fetchTables();
        };

        socketRef.current.on('tableUpdated', handleTableUpdated);
        socketRef.current.on('tableMerged', handleTableMerged);

        return () => {
            socketRef.current.off('tableUpdated', handleTableUpdated);
            socketRef.current.off('tableMerged', handleTableMerged);
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

    const getSlaveTablesForMaster = (masterNumber) => {
        return tables.filter(t => String(t.merged_into) === String(masterNumber)).map(t => t.tableNumber);
    };

    const handleUnmergeTable = async (tableNumber) => {
        if (!window.confirm(`Xác nhận tách Bàn ${tableNumber} ra độc lập?`)) return;
        try {
            await unmergeTable(accessToken, tableNumber);
            toast.success(`Đã tách Bàn ${tableNumber} thành công!`);
            fetchTables();
            emitTableChange();
        } catch (error) {
            toast.error(error.message || 'Lỗi khi tách bàn');
            console.error("Error unmerging table:", error);
        }
    };

    const handleCancelReservation = async (reservationId) => {
        if (!reservationId) return;
        if (window.confirm('Bạn có chắc chắn muốn hủy đặt bàn này? Bàn sẽ được giải phóng ngay lập tức.')) {
            try {
                await cancelReservation(accessToken, reservationId);
                fetchTables();
                emitTableChange();
                toast.success('Đã hủy đặt và giải phóng bàn thành công!');

                // Cập nhật lại viewTable nếu đang mở modal
                if (showViewModal && viewTable) {
                    fetchReservationInfo(viewTable._id);
                    // Cần fetch lại tables list để update status bàn trong viewTable
                    const updatedTables = await (await fetch('/api/tables')).json();
                    const currentView = updatedTables.find(t => t._id === viewTable._id);
                    if (currentView) setViewTable(currentView);
                }
            } catch (error) {
                toast.error('Lỗi khi hủy đặt bàn: ' + error.message);
                console.error("Error cancelling reservation:", error);
            }
        }
    };

    const handleStartUsingTable = async (table) => {
        const tableId = table._id;
        let confirmMessage = 'Xác nhận chuyển trạng thái bàn sang đang sử dụng?';
        let isReservationMatch = false;

        // Nếu bàn có lịch đặt trong vòng 1 tiếng tới hoặc khách đến trễ (đã qua giờ đặt)
        if (table.nextReservationTime) {
            const now = new Date();
            const resTime = new Date(table.nextReservationTime);
            const diffMs = resTime - now;

            // <= 45 phút (2700000 ms) hoặc đã qua giờ
            if (diffMs <= 2700000) {
                isReservationMatch = true;
                const cusName = table.customerName || 'Khách';
                confirmMessage = `"${cusName}" bắt đầu sử dụng bàn đúng không?`;
            }
        }

        // Dự phòng cho trường hợp trạng thái Đã đặt mà không bắt được nextReservationTime rõ ràng
        if (!isReservationMatch && table.status === 'Đã đặt' && table.note === 'Bàn đang giữ chỗ') {
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

    const highlight = (text, isNumber = false) => {
        if (!debouncedSearch) return text;
        const lowerSearch = debouncedSearch.toLowerCase().trim();
        const strText = String(text);
        if (!strText.toLowerCase().includes(lowerSearch)) return text;

        const parts = strText.split(new RegExp(`(${lowerSearch})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === lowerSearch ? (
                <mark key={index} style={{ backgroundColor: '#ffef9ad1', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
            ) : part
        );
    };

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="staff-management block-category ps-0 pt-0">
            <div className="staff-management__header d-flex justify-content-between align-items-center mb-4 mt-4 px-0">
                <h2 className="title-admin mb-0" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748', marginLeft: '0', paddingLeft: '0' }}>Quản lý bàn
                    <style>{`.title-admin::after { display: none !important; }`}</style> </h2>
                <div className="d-flex align-items-center gap-2">
                    <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ width: '160px' }}
                        className="bg-white border-secondary-subtle shadow-none"
                    >
                        <option value="Tất cả">Tất cả trạng thái</option>
                        <option value="Trống">Trống</option>
                        <option value="Đã đặt">Đã đặt</option>
                        <option value="Đang sử dụng">Đang sử dụng</option>
                    </Form.Select>

                    <div className="search-container" style={{ width: '350px' }}>
                        <InputGroup className="shadow-sm rounded">
                            <InputGroup.Text className="bg-white border-end-0 border-secondary-subtle">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm số bàn, mã đặt bàn..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-start-0 border-secondary-subtle ps-1 shadow-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setDebouncedSearch(searchTerm);
                                        const lowerSearch = searchTerm.toLowerCase().trim();
                                        if (!lowerSearch) return;
                                        const instantMatch = tables.filter(table => {
                                            if (statusFilter !== 'Tất cả' && table.status !== statusFilter) return false;
                                            if (/^\d+$/.test(lowerSearch)) return String(table.tableNumber).includes(lowerSearch);
                                            const codes = (table.reservationList || []).map(r => (r.confirmationCode || '').toLowerCase());
                                            return codes.some(code => code.includes(lowerSearch));
                                        });
                                        if (instantMatch.length > 0) handleShowViewModal(instantMatch[0]);
                                    }
                                }}
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
                    <Button
                        className="btn-add d-flex align-items-center gap-2 ms-2"
                        onClick={handleShowAddModal}
                        style={{ backgroundColor: '#2d9e45ff', border: 'none', padding: '10px 22px', fontWeight: '500' }}
                    >
                        <FaPlus /> Thêm bàn mới
                    </Button>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={1000} />

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
                    <Table striped bordered hover className="mt-3 text-center align-middle">
                        <thead className="table-success">
                            <tr>
                                <th>Số bàn</th>
                                <th>Trạng thái</th>
                                <th>Sức chứa</th>
                                <th style={{ width: '300px' }}>Hành động</th>
                                <th style={{ width: '300px' }}>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTables.map((table) => (
                                <tr key={table._id}>
                                    <td>
                                        Bàn {highlight(table.tableNumber, true)}
                                        {table.reservationNote && !table.merged_into && (
                                            <div className="mt-1 text-muted" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                                                (Ghi chú: {table.reservationNote})
                                            </div>
                                        )}
                                        {table.merged_into && (
                                            <div className="mt-1">
                                                <span className="badge bg-secondary p-1">
                                                    Đã gộp (→ Bàn {table.merged_into})
                                                </span>
                                            </div>
                                        )}
                                        {getSlaveTablesForMaster(table.tableNumber).length > 0 && (
                                            <div className="mt-1">
                                                <span className="badge p-1" style={{backgroundColor: '#17a2b8'}}>
                                                    MASTER (Gồm: {getSlaveTablesForMaster(table.tableNumber).join(', ')})
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column align-items-center">
                                            <span className={`badge ${getStatusBadgeClass(table.status)}`}>
                                                {table.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{highlight(table.seatingCapacity, true)}</td>
                                    <td className="text-start">
                                        <div className="d-flex align-items-center justify-content-start gap-1">
                                            <button className="btn btn-sm btn-link p-1" title="Xem chi tiết" onClick={() => handleShowViewModal(table)}>
                                                <FaEye className='icon-view fs-5 text-info' />
                                            </button>
                                            <button className="btn btn-sm btn-link p-1" title="Sửa thông tin" onClick={() => handleShowEditModal(table)}>
                                                <FaRegEdit className='icon-update fs-5 text-success' />
                                            </button>


                                            {table.merged_into && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleUnmergeTable(table.tableNumber)}
                                                    className="ms-1 fw-500 text-white"
                                                    style={{ fontSize: '11px', borderRadius: '20px' }}
                                                >
                                                    Tách bàn
                                                </Button>
                                            )}

                                            {!table.merged_into && getSlaveTablesForMaster(table.tableNumber).length === 0 && (
                                                <Button
                                                    variant="info"
                                                    size="sm"
                                                    onClick={() => { setSelectedTable(table); setShowMergeModal(true); setMergeToTable(''); }}
                                                    className="ms-1 fw-500 text-white"
                                                    style={{ fontSize: '11px', borderRadius: '20px' }}
                                                >
                                                    Gộp bàn
                                                </Button>
                                            )}

                                            {(table.status === 'Trống' || table.status === 'Đã đặt' || table.status === 'Hoàn thành') && !table.merged_into && getSlaveTablesForMaster(table.tableNumber).length === 0 && (
                                                <Button
                                                    variant="warning"
                                                    size="sm"
                                                    onClick={() => handleStartUsingTable(table)}
                                                    className="ms-2 px-3 fw-500"
                                                    style={{ fontSize: '12px', borderRadius: '20px' }}
                                                >
                                                    Sử dụng
                                                </Button>
                                            )}
                                            {table.status === 'Đang sử dụng' && !table.merged_into && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleCompleteReservation(table._id)}
                                                    className="ms-2 px-3 fw-500"
                                                    style={{ fontSize: '12px', borderRadius: '20px' }}
                                                >
                                                    Hoàn thành
                                                </Button>
                                            )}
                                            {table.status === 'Đã đặt' && (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleCancelReservation(table.activeReservationId)}
                                                    className="ms-1 fw-500"
                                                    style={{ fontSize: '11px', borderRadius: '20px' }}
                                                >
                                                    Hủy đặt
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-start">
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
                            ))}
                        </tbody>
                    </Table>
                    {totalPages > 1 && (
                        <div className="admin-pagination">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Prev
                            </button>

                            {(() => {
                                const maxVisiblePages = 5;
                                const currentGroup = Math.ceil(currentPage / maxVisiblePages);
                                const startPage = (currentGroup - 1) * maxVisiblePages + 1;
                                const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
                                const pageNumbers = [];
                                for (let i = startPage; i <= endPage; i++) {
                                    pageNumbers.push(
                                        <button
                                            key={i}
                                            className={currentPage === i ? 'active' : ''}
                                            onClick={() => setCurrentPage(i)}
                                        >
                                            {i}
                                        </button>
                                    );
                                }
                                return pageNumbers;
                            })()}

                            <button
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

            {/* Modal Gộp Bàn */}
            <Modal show={showMergeModal} onHide={() => setShowMergeModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Gộp bàn {selectedTable?.tableNumber}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Chọn bàn đích (Bàn này sẽ gộp vào)</Form.Label>
                        <Form.Select 
                            value={mergeToTable}
                            onChange={(e) => setMergeToTable(e.target.value)}
                        >
                            <option value="">-- Chọn bàn đích --</option>
                            {tables.filter(t => 
                                !t.merged_into && 
                                t.tableNumber !== selectedTable?.tableNumber
                            ).map(t => (
                                <option key={t._id} value={t.tableNumber}>
                                    Bàn {t.tableNumber} - {t.status} - {t.location}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMergeModal(false)}>Đóng</Button>
                    <Button variant="primary" onClick={async () => {
                        if (!mergeToTable) return toast.error('Vui lòng chọn bàn đích!');
                        try {
                            await mergeTable(accessToken, {
                                fromTable: selectedTable.tableNumber,
                                toTable: Number(mergeToTable)
                            });
                            toast.success(`Đã gộp bàn ${selectedTable.tableNumber} vào bàn ${mergeToTable}`);
                            setShowMergeModal(false);
                            fetchTables();
                        } catch (e) {
                            toast.error(e.message || 'Lỗi gộp bàn');
                        }
                    }}>Thực hiện gộp</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Xem Chi Tiết */}
            <Modal show={showViewModal} onHide={handleCloseViewModal} size="xl" className="custom-detail-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="title-admin">Chi tiết bàn</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '25px', paddingTop: 0 }}>
                    {viewTable && (
                        <div className="table-details">
                            <Row>
                                {/* Cột trái: Thông tin và QR Code */}
                                <Col md={5} lg={4} className="border-end pl-0">
                                    <div className="info-section mb-4">
                                        <h6 className="fw-bold mb-3 d-flex align-items-center text-success">
                                            <FaUtensils className="me-2" /> Thông tin bàn
                                        </h6>
                                        <div className="bg-light p-3 rounded">
                                            <div className="mb-2"><strong>Số bàn:</strong> Bàn {viewTable.tableNumber}</div>
                                            <div className="mb-2"><strong>Trạng thái:</strong> <span className={`badge ${getStatusBadgeClass(viewTable.status)}`}>{viewTable.status}</span></div>
                                            <div className="mb-2"><strong>Sức chứa:</strong> {viewTable.seatingCapacity} người</div>
                                            <div className="mb-0"><strong>Vị trí:</strong> {viewTable.location}</div>
                                        </div>
                                    </div>

                                    <div className="qr-section text-center p-3 bg-light rounded shadow-sm">
                                        <h6 className="fw-bold mb-3">Mã quét gọi món (QR Code)</h6>
                                        <div className="d-flex justify-content-center py-2 bg-white rounded p-2 mb-2" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {viewTable.qrCode ? (
                                                <img
                                                    src={viewTable.qrCode}
                                                    alt={`QR Code bàn ${viewTable.tableNumber}`}
                                                    style={{ width: '180px', height: '180px', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        // Fallback nếu ảnh từ backend bị lỗi
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{ display: viewTable.qrCode ? 'none' : 'block' }}>
                                                <QRCodeSVG
                                                    value={`${CLIENT_URL}/menu?table=${viewTable.tableNumber}`}
                                                    size={180}
                                                    level="H"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-2 text-muted" style={{ fontSize: '13px' }}>Khách quét mã để xem menu và đặt món</div>
                                    </div>
                                </Col>

                                {/* Cột phải: Lịch đặt bàn */}
                                <Col md={7} lg={8} className="pr-0">
                                    <div className="reservation-schedule d-flex flex-column h-100">
                                        <div className="flex-grow-0">
                                            <h6 className="fw-bold mb-3 d-flex align-items-center text-primary">
                                                <FaSearch className="me-2" /> Lịch đặt bàn sắp tới
                                            </h6>
                                            <div className="table-responsive">
                                                <AntTable
                                                    columns={[
                                                        {
                                                            title: 'Mã đặt',
                                                            dataIndex: 'confirmationCode',
                                                            key: 'confirmationCode',
                                                            align: 'center',
                                                            render: (text) => <span className="fw-bold text-primary">{text}</span>
                                                        },
                                                        {
                                                            title: 'Khách hàng',
                                                            dataIndex: 'customerName',
                                                            key: 'customerName',
                                                            align: 'center',
                                                            render: (text) => <span className="fw-bold">{text || 'Khách vãng lai'}</span>
                                                        },
                                                        {
                                                            title: 'Thời gian',
                                                            key: 'time',
                                                            render: (_, record) => (
                                                                <div className="small">
                                                                    <div className="fw-bold">{new Date(record.use_date).toLocaleDateString('vi-VN')}</div>
                                                                    <div className="text-muted">{new Date(record.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                                                                </div>
                                                            )
                                                        },
                                                        {
                                                            title: 'Trạng thái',
                                                            dataIndex: 'status',
                                                            key: 'status',
                                                            align: 'center',
                                                            render: (status) => {
                                                                let color = 'default';
                                                                if (status === 'Đã đặt') color = 'warning';
                                                                if (status === 'Đang sử dụng') color = 'error';
                                                                if (status === 'Trống') color = 'success';
                                                                if (status === 'Đã hủy') color = 'default';
                                                                return <Tag color={color} style={{ borderRadius: '10px' }}>{status}</Tag>;
                                                            }
                                                        },
                                                        {
                                                            title: 'Hủy đặt',
                                                            key: 'actions',
                                                            align: 'center',
                                                            render: (_, record) => (
                                                                record.status === 'Đã đặt' && (
                                                                    <Button
                                                                        variant="outline-danger"
                                                                        size="sm"
                                                                        className="p-1 px-2 border-0"
                                                                        title="Hủy đặt bàn này"
                                                                        onClick={() => handleCancelReservation(record._id)}
                                                                        style={{ borderRadius: '5px', backgroundColor: '#fff5f5' }}
                                                                    >
                                                                        <MdCancel className="fs-5" />
                                                                    </Button>
                                                                )
                                                            )
                                                        }
                                                    ]}
                                                    dataSource={(viewTable.reservationList || []).filter(r => {
                                                        const resDate = new Date(r.use_date);
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        return r.status === 'Đã đặt' && resDate >= today;
                                                    })}
                                                    rowKey="_id"
                                                    pagination={{ pageSize: 3, size: 'small' }}
                                                    size="small"
                                                    bordered
                                                    locale={{ emptyText: 'Chưa có lịch đặt sắp tới' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="customer-info-today mt-4">
                                            <h6 className="fw-bold mb-3 d-flex align-items-center text-success">
                                                <FaRegEdit className="me-2" /> Thông tin khách đặt hôm nay
                                            </h6>
                                            {reservationInfo ? (
                                                <div className="bg-light p-3 rounded border shadow-sm">
                                                    <Row className="g-3">
                                                        <Col sm={6}>
                                                            <div className="mb-2"><strong>Tên khách:</strong> {reservationInfo.customerName}</div>
                                                            <div className="mb-2"><strong>Điện thoại:</strong> {reservationInfo.phoneNumber}</div>
                                                            <div className="mb-0"><strong>Email:</strong> {reservationInfo.email}</div>
                                                        </Col>
                                                        <Col sm={6}>
                                                            <div className="mb-2"><strong>Giờ đến:</strong> <span className="text-primary fw-bold">{reservationInfo.use_time}</span></div>
                                                            <div className="mb-2"><strong>Mã xác nhận:</strong> <span className="text-danger fw-bold">{reservationInfo.confirmationCode}</span></div>
                                                            <div className="mb-0 text-truncate"><strong>Yêu cầu:</strong> {reservationInfo.specialRequests || 'Không có'}</div>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ) : (
                                                <div className="bg-light p-3 rounded text-center text-muted border">
                                                    Hiện chưa có khách đặt chỗ trực tuyến trong ngày
                                                </div>
                                            )}
                                        </div>

                                        <div className="modal-actions d-flex justify-content-between mt-auto pt-4 border-top">
                                            <Button
                                                variant="danger"
                                                onClick={() => {
                                                    handleCloseViewModal();
                                                    handleDeleteTable(viewTable._id);
                                                }}
                                                className="px-4 fw-bold text-white border-0"
                                                style={{ borderRadius: '10px' }}
                                            >
                                                <MdDelete className="me-1" /> Xóa bàn
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={handleCloseViewModal}
                                                className="px-4 fw-bold text-white border-0"
                                                style={{ borderRadius: '10px', backgroundColor: '#6c757d' }}
                                            >
                                                Đóng
                                            </Button>

                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default TableManagement;