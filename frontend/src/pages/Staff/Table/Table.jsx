import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Button, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaRegEdit, FaSearch, FaUtensils, FaPlus, FaEye, FaEyeSlash, FaTimesCircle, FaSortAmountDownAlt, FaSortAmountUp, FaRegIdCard, FaCalendarAlt, FaCrown, FaLink, FaLayerGroup, FaCircle, FaMoneyBillWave } from 'react-icons/fa';
import { MdDelete, MdCancel } from 'react-icons/md';
import { IoMdClose } from "react-icons/io";
import { socket } from '../../../socket.js';
import './table.scss';
import { completeReservation, cancelReservation, mergeTable, unmergeTable, unmergeAllSlaves } from '../../../actions/table.js';
import { Table as AntTable, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

const CLIENT_URL = window.location.origin;

const TableManagement = () => {
    const navigate = useNavigate();
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
    const [sortOrder, setSortOrder] = useState('desc');
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
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [viewTable, setViewTable] = useState(null);
    const [reservationInfo, setReservationInfo] = useState(null);
    const [allReservations, setAllReservations] = useState([]);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeToTable, setMergeToTable] = useState('');
    const [showPaymentMergeModal, setShowPaymentMergeModal] = useState(false);
    const [paymentMergeOrders, setPaymentMergeOrders] = useState([]);
    const [selectedMergeTable, setSelectedMergeTable] = useState('');
    const [selectedSlaveTables, setSelectedSlaveTables] = useState([]);
    const [selectedSplitTables, setSelectedSplitTables] = useState([]);

    const [showMergeBillsModal, setShowMergeBillsModal] = useState(false);
    const [selectedMergeBillsTable, setSelectedMergeBillsTable] = useState(null);
    const [slaveTablesToMerge, setSlaveTablesToMerge] = useState([]);

    // New state for multi-payment
    const [selectedMultiPayTables, setSelectedMultiPayTables] = useState([]);
    const [isMultiPayMode, setIsMultiPayMode] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveToTable, setMoveToTable] = useState('');
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
        fetchTables(sortOrder);
    }, [socketTables, sortOrder]);


    const fetchTables = async (order = sortOrder) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (order) {
                queryParams.append('sortBy', 'seatingCapacity');
                queryParams.append('order', order);
            }
            const response = await fetch(`/api/tables?${queryParams.toString()}`);
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

    const emitTableChange = () => {
        if (socketRef.current) {
            socketRef.current.emit('tableStatusChanged');
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
                fetchTables(sortOrder);
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
            fetchTables(sortOrder);
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
            fetchTables(sortOrder);
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

    const handleShowScheduleModal = (table) => {
        setViewTable(table);
        setShowScheduleModal(true);
    };

    const handleCloseScheduleModal = () => {
        setShowScheduleModal(false);
        setViewTable(null);
    };

    const handleCompleteReservation = async (tableId) => {
        if (window.confirm('Bạn có chắc chắn muốn đánh dấu bàn này là đã hoàn thành?')) {
            try {
                await completeReservation(accessToken, tableId);

                fetchTables(sortOrder);
                emitTableChange();
                toast.success('Cập nhật trạng thái bàn thành công!');
            } catch (error) {
                toast.error('Lỗi khi cập nhật trạng thái bàn: ' + error.message);
                console.error("Error completing reservation:", error);
            }
        }
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

    const handleUnmergeAllSlaves = async (masterTableNumber) => {
        if (!window.confirm(`Xác nhận phân rã toàn bộ bàn con của Bàn ${masterTableNumber}? Tất cả bàn con sẽ trở về trạng thái Trống.`)) return;
        try {
            const result = await unmergeAllSlaves(accessToken, masterTableNumber);
            toast.success(result.message);
            fetchTables();
            emitTableChange();
        } catch (error) {
            toast.error(error.message || 'Lỗi khi phân rã bàn');
            console.error("Error unmerging all slaves:", error);
        }
    };

    const handleCancelReservation = async (reservationId) => {
        if (!reservationId) return;
        if (window.confirm('Bạn có chắc chắn muốn hủy đặt bàn này? Bàn sẽ được giải phóng ngay lập tức.')) {
            try {
                await cancelReservation(accessToken, reservationId);
                fetchTables(sortOrder);
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

                const updatedTable = await response.json();

                fetchTables(sortOrder);
                emitTableChange();
                toast.success(`Đã mở bàn thành công! Mã PIN: ${updatedTable.session_pin || '----'}`, { autoClose: 5000 });
            } catch (error) {
                toast.error('Lỗi khi cập nhật trạng thái: ' + error.message);
            }
        }
    };

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'Trống':
                return 'text-success';
            case 'Đã đặt':
                return 'text-warning';
            case 'Đang sử dụng':
                return 'text-danger';
            default:
                return 'text-secondary';
        }
    };

    const handleMergeBillsSubmit = async () => {
        if (!selectedMergeBillsTable || slaveTablesToMerge.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một bàn để gộp hóa đơn!');
            return;
        }
        try {
            const resp = await fetch('/api/payment/merge-bills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    mainTableNumber: selectedMergeBillsTable,
                    slaveTableNumbers: slaveTablesToMerge
                })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success('Gộp hóa đơn thành công!');
                setShowMergeBillsModal(false);
                setSlaveTablesToMerge([]);
                fetchTables();
            } else {
                toast.error(data.message || 'Lỗi gộp hóa đơn');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi kết nối khi gộp hóa đơn');
        }
    };

    const handlePaymentRedirect = async (tableNumber) => {
        try {
            const response = await fetch(`/api/order/guest/table/${tableNumber}`);
            const data = await response.json();
            if (response.ok && data && data.length > 0) {
                if (data.length === 1) {
                    // Nếu chỉ có 1 khách (1 đơn hàng), chuyển thẳng đến chi tiết đơn hàng
                    navigate(`/staff/order/detail/${data[0].order.id || data[0].order._id}`);
                } else {
                    setPaymentMergeOrders(data.map(d => d.order));
                    setShowPaymentMergeModal(true);
                }
            } else {
                toast.warning('Không tìm thấy đơn hàng chưa thanh toán cho bàn này!');
            }
        } catch (e) {
            console.error(e);
            toast.error('Có lỗi xảy ra khi lấy thông tin đơn hàng');
        }
    };

    const handleMergePayments = async () => {
        try {
            const orderIds = paymentMergeOrders.map(o => o._id || o.id);
            const response = await fetch('/api/order/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setShowPaymentMergeModal(false);
                navigate(`/staff/order/detail/${data.newOrderId}`);
            } else {
                toast.error(data.message || 'Lỗi gộp hóa đơn');
            }
        } catch (e) {
            toast.error('Lỗi kết nối gộp đơn');
        }
    }

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
                    <button
                        className="btn btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={() => {
                            const nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                            setSortOrder(nextOrder);
                            fetchTables(nextOrder);
                        }}
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #dee2e6' }}
                        title={sortOrder === 'desc' ? "Sắp xếp: Sức chứa Lớn -> Bé" : "Sắp xếp: Sức chứa Bé -> Lớn"}
                    >
                        {sortOrder === 'asc' ? <FaSortAmountUp className="text-success" /> : <FaSortAmountDownAlt className="text-success" />}
                        Sức chứa ({sortOrder === 'desc' ? "Lớn → Bé" : "Bé → Lớn"})
                    </button>
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
                                <th style={{ width: '100px' }}>Số bàn</th>
                                <th style={{ width: '150px' }}>Trạng thái</th>
                                <th style={{ width: '100px' }}>Sức chứa</th>
                                <th style={{ width: '100px' }}>Cấu hình</th>
                                <th style={{ width: '100px' }}>Lịch đặt</th>
                                <th style={{ width: '400px' }}>Hành động</th>
                                <th style={{ width: '90px' }}>Mã PIN</th>
                                <th style={{ width: '200px' }}>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTables.map((table) => (
                                <tr key={table._id}>
                                    <td>
                                        <div className="d-flex align-items-center justify-content-center gap-2">
                                            {isMultiPayMode && table.status === 'Đang sử dụng' && table.hasOrders && !table.isPaid && !table.merged_into && (
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedMultiPayTables.includes(table.tableNumber)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMultiPayTables([...selectedMultiPayTables, table.tableNumber]);
                                                        } else {
                                                            setSelectedMultiPayTables(selectedMultiPayTables.filter(t => t !== table.tableNumber));
                                                        }
                                                    }}
                                                    title="Chọn để thanh toán chung"
                                                    style={{ transform: 'scale(1.2)' }}
                                                />
                                            )}
                                            <div className="fw-300" style={{ fontSize: '1.1rem' }}>
                                                Bàn {highlight(table.tableNumber, true)}
                                            </div>
                                        </div>
                                        {table.reservationNote && !table.merged_into && (
                                            <div className="mt-1 text-muted" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                                                (Ghi chú: {table.reservationNote})
                                            </div>
                                        )}
                                        {table.merged_into && (
                                            <div className="mt-1 d-flex justify-content-center">
                                                <span className="badge rounded-pill bg-light text-secondary border d-flex align-items-center gap-1 shadow-sm" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                                    <FaLink style={{ fontSize: '10px' }} /> Đã gộp → Bàn {table.merged_into}
                                                </span>
                                            </div>
                                        )}
                                        {getSlaveTablesForMaster(table.tableNumber).length > 0 && (
                                            <div className="mt-1 d-flex justify-content-center">
                                                <span className="badge rounded-pill d-flex align-items-center gap-1 shadow-sm" style={{ backgroundColor: '#0c5b7b', color: '#fff', padding: '4px 10px', fontSize: '11px' }}>
                                                    <FaCrown style={{ color: '#ffd700', fontSize: '13px' }} /> MASTER
                                                    <small className="ms-1" style={{ opacity: 1, fontSize: '13px' }}>({getSlaveTablesForMaster(table.tableNumber).join(', ')})</small>
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-start ps-4">
                                        <div className="d-flex align-items-center gap-2 fw-bold" style={{ fontSize: '14px' }}>
                                            <FaCircle className={getStatusColorClass(table.status)} style={{ fontSize: '8px' }} />
                                            <span className={getStatusColorClass(table.status)}>
                                                {table.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{highlight(table.seatingCapacity, true)}</td>
                                    <td>
                                        <div className="d-flex align-items-center justify-content-center gap-1">
                                            <button className="btn btn-sm btn-link p-1" title="Cấu hình bàn & QR" onClick={() => handleShowViewModal(table)}>
                                                <FaRegIdCard className='icon-view fs-5 text-info' />
                                            </button>
                                            <button className="btn btn-sm btn-link p-1" title="Sửa thông số" onClick={() => handleShowEditModal(table)}>
                                                <FaRegEdit className='icon-update fs-5 text-success' />
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <button className="btn btn-sm btn-link p-1" title="Lịch đặt bàn" onClick={() => handleShowScheduleModal(table)}>
                                                <FaCalendarAlt className='fs-5 text-primary' />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="text-start">
                                        <div className="d-flex align-items-center justify-content-start gap-2">
                                            {table.merged_into && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleUnmergeTable(table.tableNumber)}
                                                    className="fw-500 text-white"
                                                    style={{ fontSize: '11px', borderRadius: '20px', minWidth: '90px' }}
                                                >
                                                    Tách bàn
                                                </Button>
                                            )}

                                            {!table.merged_into && (
                                                <Button
                                                    variant="info"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedTable(table);
                                                        setShowMergeModal(true);
                                                        setMergeToTable('');
                                                    }}
                                                    className="fw-500 text-white"
                                                    style={{ fontSize: '11px', borderRadius: '20px', minWidth: '90px' }}
                                                >
                                                    Gộp bàn
                                                </Button>
                                            )}

                                            {table.status === 'Đang sử dụng' && !table.merged_into && (
                                                <>
                                                    {getSlaveTablesForMaster(table.tableNumber).length > 0 ? (
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handleUnmergeAllSlaves(table.tableNumber)}
                                                            className="fw-500 text-white"
                                                            style={{ fontSize: '11px', borderRadius: '20px', minWidth: '90px' }}
                                                            title="Giải phóng toàn bộ bàn con đang gộp vào bàn này"
                                                        >
                                                            Phân rã
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="dark"
                                                            size="sm"
                                                            onClick={() => { setSelectedTable(table); setShowMoveModal(true); setMoveToTable(''); }}
                                                            className="fw-500 text-white"
                                                            style={{ fontSize: '11px', borderRadius: '20px', minWidth: '90px' }}
                                                        >
                                                            Chuyển bàn
                                                        </Button>
                                                    )}
                                                </>
                                            )}

                                            {(table.status === 'Đang sử dụng') && !table.merged_into && table.hasOrders && !table.isPaid && (
                                                <>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handlePaymentRedirect(table.tableNumber)}
                                                        className="fw-bold text-white mb-1"
                                                        style={{ fontSize: '11px', borderRadius: '20px', padding: '4px 10px', minWidth: '90px' }}
                                                    >
                                                        Thanh toán
                                                    </Button>
                                                </>
                                            )}

                                            {(table.status === 'Trống' || table.status === 'Đã đặt' || table.status === 'Hoàn thành') && !table.merged_into && getSlaveTablesForMaster(table.tableNumber).length === 0 && (
                                                <Button
                                                    variant="warning"
                                                    size="sm"
                                                    onClick={() => handleStartUsingTable(table)}
                                                    className="fw-500"
                                                    style={{ fontSize: '12px', borderRadius: '20px', minWidth: '90px' }}
                                                >
                                                    Sử dụng
                                                </Button>
                                            )}

                                            {table.status === 'Đang sử dụng' && !table.merged_into && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleCompleteReservation(table._id)}
                                                    className={`fw-500 ${table.isPaid ? 'pulse-button' : ''}`}
                                                    style={{ fontSize: '12px', borderRadius: '20px', minWidth: '90px' }}
                                                    title={table.isPaid ? "Khách đã thanh toán, dọn bàn để đón khách mới" : "Xác nhận khách đã xong, dọn bàn và reset PIN"}
                                                >
                                                    Giải phóng
                                                </Button>
                                            )}

                                            {table.status === 'Đã đặt' && (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleCancelReservation(table.activeReservationId)}
                                                    className="fw-500"
                                                    style={{ fontSize: '11px', borderRadius: '20px', minWidth: '90px' }}
                                                >
                                                    Hủy đặt
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {table.status === 'Đang sử dụng' && table.session_pin ? (
                                            <span className="badge bg-white text-dark p-1" style={{ letterSpacing: '2px', fontSize: '1rem' }}>
                                                {table.session_pin}
                                            </span>
                                        ) : (
                                            <span className="text-muted">---</span>
                                        )}
                                    </td>
                                    <td className="text-start">
                                        <div className="d-flex flex-column">
                                            <span style={{ color: table.isPaid ? '#198754' : '#6c757d', fontSize: '13px', fontWeight: table.isPaid ? '500' : 'normal' }}>
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

                    <div className="d-flex justify-content-end mb-3 mt-3">
                        {!isMultiPayMode ? (
                            <Button
                                variant="outline-primary"
                                className="fw-bold px-4 rounded-pill shadow-sm"
                                onClick={() => setIsMultiPayMode(true)}
                                style={{ border: '2px solid #0d6efd' }}
                            >
                                Thanh toán nhiều bàn
                            </Button>
                        ) : (
                            <div className="bg-white p-2 px-3 rounded shadow-sm border border-primary d-flex align-items-center gap-3">
                                <div className="fw-bold text-primary">Đã chọn {selectedMultiPayTables.length} bàn</div>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="fw-bold px-3 rounded-pill"
                                    disabled={selectedMultiPayTables.length < 2}
                                    onClick={() => {
                                        navigate(`/staff/order/multi-payment?tables=${selectedMultiPayTables.join(',')}`);
                                    }}
                                >
                                    Thanh toán chung
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="rounded-circle p-1"
                                    onClick={() => {
                                        setSelectedMultiPayTables([]);
                                        setIsMultiPayMode(false);
                                    }}
                                    style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <IoMdClose size={14} />
                                </Button>
                            </div>
                        )}
                    </div>

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

            {/* Modal Chọn Thanh toán */}
            <Modal show={showPaymentMergeModal} onHide={() => setShowPaymentMergeModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Thanh toán Bàn {paymentMergeOrders[0]?.table_number}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="alert alert-info">
                        Bàn này có <strong>{paymentMergeOrders.length}</strong> phiên gọi món đang hoạt động. Bạn hãy chọn khách hàng muốn thanh toán hoặc gộp tất cả.
                    </div>

                    <Table hover responsive className="mt-3 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Khách hàng</th>
                                <th>Số món</th>
                                <th>Tổng tiền</th>
                                <th className="text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentMergeOrders.map((order, idx) => (
                                <tr key={idx}>
                                    <td className="fw-bold">{order.guest_name || 'Khách vãng lai'}</td>
                                    <td>{order.total_item}</td>
                                    <td className="text-danger fw-bold">{order.total_price.toLocaleString()} đ</td>
                                    <td className="text-center">
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => navigate(`/staff/order/detail/${order._id || order.id}`)}
                                        >
                                            Tính tiền riêng
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer className="justify-content-between">
                    <Button variant="outline-secondary" onClick={() => setShowPaymentMergeModal(false)}>
                        Đóng
                    </Button>
                    <Button variant="primary" onClick={handleMergePayments} disabled={paymentMergeOrders.length < 2}>
                        Gộp tất cả & Thanh toán chung
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Sửa */}
            <Modal show={showEditModal} onHide={handleCloseEditModal}>
                <Modal.Header closeButton>
                    <h4 style={{ color: '#0b607fff' }}>Sửa bàn {selectedTable?.tableNumber}</h4>
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

            <Modal show={showMergeModal} onHide={() => setShowMergeModal(false)} centered>
                <Modal.Header closeButton style={{ backgroundColor: '#f8fafc' }}>
                    <Modal.Title className="fw-bold" style={{ color: '#0b607f', fontSize: '18px' }}>
                        Gộp thêm bàn vào Bàn {selectedTable?.tableNumber}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTable && (
                        <div className="master-table-info bg-light p-3 rounded mb-4 border">
                            <h6 className="fw-bold text-secondary mb-3"><FaUtensils className="me-2" />Thông tin bàn chính (Master)</h6>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Số bàn:</span>
                                <span className="fw-bold">Bàn {selectedTable.tableNumber}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Sức chứa:</span>
                                <span>{selectedTable.seatingCapacity} người</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Vị trí:</span>
                                <span>{selectedTable.location}</span>
                            </div>
                        </div>
                    )}

                    <Form.Group>
                        <Form.Label className="fw-500"><FaPlus className="me-2 text-success" />Chọn bàn phụ cần gộp vào (Slave)</Form.Label>
                        <Form.Select
                            value={mergeToTable}
                            onChange={(e) => setMergeToTable(e.target.value)}
                            className="shadow-sm"
                            style={{ borderRadius: '10px', padding: '10px' }}
                        >
                            <option value="">-- Chọn bàn trống --</option>
                            {tables.filter(t =>
                                t.status === 'Trống' &&
                                !t.merged_into &&
                                t.tableNumber !== selectedTable?.tableNumber
                            ).map(t => (
                                <option key={t._id} value={t.tableNumber}>
                                    Bàn {t.tableNumber} - Sức chứa: {t.seatingCapacity} - {t.location}
                                </option>
                            ))}
                        </Form.Select>
                        <Form.Text className="text-muted mt-2 d-block">
                            * Chỉ những bàn đang <strong>Trống</strong> mới có thể gộp vào bàn đang sử dụng.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMergeModal(false)}>Đóng</Button>
                    <Button variant="primary" onClick={async () => {
                        if (!mergeToTable) return toast.error('Vui lòng chọn bàn đích!');
                        try {
                            const response = await fetch('/api/tables/merge', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`
                                },
                                body: JSON.stringify({
                                    fromTable: mergeToTable, // Bàn Slave (chọn từ list)
                                    toTable: selectedTable.tableNumber // Bàn Master (bàn click nút)
                                })
                            });
                            const data = await response.json();
                            if (data.success) {
                                toast.success(data.message);
                                setShowMergeModal(false);
                                fetchTables();
                                emitTableChange();
                            } else {
                                toast.error(data.message || 'Lỗi gộp bàn');
                            }
                        } catch (e) {
                            toast.error('Lỗi kết nối server');
                        }
                    }}>Thực hiện gộp</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Cấu hình bàn & QR */}
            <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="md">
                <Modal.Header closeButton>
                    <Modal.Title className="title-admin text-info">
                        Cấu hình bàn {viewTable?.tableNumber}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewTable && (
                        <div className="table-details text-center">
                            <div className="bg-light p-3 rounded mb-4 text-start">
                                <div className="mb-2"><strong>Số bàn:</strong> Bàn {viewTable.tableNumber}</div>
                                <div className="mb-2"><strong>Trạng thái:</strong>
                                    <span className={`ms-2 fw-bold ${getStatusColorClass(viewTable.status)}`}>
                                        <FaCircle className="me-1" style={{ fontSize: '8px' }} />
                                        {viewTable.status}
                                    </span>
                                </div>
                                <div className="mb-2"><strong>Sức chứa:</strong> {viewTable.seatingCapacity} người</div>
                                <div className="mb-0"><strong>Vị trí:</strong> {viewTable.location}</div>
                            </div>

                            <div className="qr-container bg-white p-4 rounded shadow-sm d-inline-block">
                                <h6 className="fw-bold mb-3 text-secondary">Mã QR Gọi món</h6>
                                <QRCodeSVG
                                    value={`${CLIENT_URL}/menu?table=${viewTable.tableNumber}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                                <p className="mt-2 text-muted small">Khách quét mã để truy cập menu</p>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => window.print()}
                                >
                                    In mã QR
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseViewModal}>Đóng</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Lịch đặt bàn */}
            <Modal show={showScheduleModal} onHide={handleCloseScheduleModal} size="lg" centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>
                        Lịch đặt bàn {viewTable?.tableNumber}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewTable && (
                        <div className="reservation-scroll-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <AntTable
                                dataSource={[...(viewTable.reservationList || [])].sort((a, b) => {
                                    const statusOrder = { 'Đang sử dụng': 1, 'Đã đặt': 2, 'Hoàn thành': 3, 'Đã hủy': 4 };
                                    if (statusOrder[a.status] !== statusOrder[b.status]) {
                                        return statusOrder[a.status] - statusOrder[b.status];
                                    }
                                    // Cùng trạng thái thì sắp xếp theo thời gian (gần hiện tại nhất lên đầu)
                                    return new Date(a.reservationTime) - new Date(b.reservationTime);
                                })}
                                pagination={false}
                                rowKey="_id"
                                sticky={true}
                                columns={[
                                    {
                                        title: 'Mã đặt',
                                        dataIndex: 'confirmationCode',
                                        key: 'confirmationCode',
                                        render: (text) => <span className="fw-bold text-primary">{text}</span>
                                    },
                                    {
                                        title: 'Khách hàng',
                                        dataIndex: 'customerName',
                                        key: 'customerName',
                                        render: (text) => <span className="fw-bold">{text || 'Khách vãng lai'}</span>
                                    },
                                    {
                                        title: 'Số điện thoại',
                                        dataIndex: 'phoneNumber',
                                        key: 'phoneNumber',
                                    },
                                    {
                                        title: 'Thời gian',
                                        key: 'time',
                                        render: (_, record) => (
                                            <div>
                                                <div className="fw-bold">{new Date(record.use_date).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-muted small">{new Date(record.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'Trạng thái',
                                        dataIndex: 'status',
                                        key: 'status',
                                        render: (status) => {
                                            let color = 'blue';
                                            if (status === 'Đã đặt') color = 'orange';
                                            if (status === 'Đang sử dụng') color = 'red';
                                            if (status === 'Hoàn thành') color = 'green';
                                            if (status === 'Đã hủy') color = 'default';
                                            return <Tag color={color}>{status}</Tag>
                                        }
                                    }
                                ]}
                            />
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseScheduleModal}>Đóng</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Chuyển Bàn */}
            <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
                <Modal.Header closeButton>
                    <h4 style={{ color: '#007bff' }}>Chuyển bàn {selectedTable?.tableNumber}</h4>
                </Modal.Header>
                <Modal.Body>
                    <div className="alert alert-warning">
                        Dữ liệu đơn hàng và phiên gọi món sẽ được chuyển sang bàn mới.
                    </div>
                    <Form.Group>
                        <Form.Label>Chọn bàn trống để chuyển đến</Form.Label>
                        <Form.Select
                            value={moveToTable}
                            onChange={(e) => setMoveToTable(e.target.value)}
                        >
                            <option value="">-- Chọn bàn trống --</option>
                            {tables.filter(t =>
                                t.status === 'Trống' &&
                                !t.merged_into &&
                                t.tableNumber !== selectedTable?.tableNumber
                            ).map(t => (
                                <option key={t._id} value={t.tableNumber}>
                                    Bàn {t.tableNumber} - {t.location}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMoveModal(false)}>Đóng</Button>
                    <Button variant="success" onClick={async () => {
                        if (!moveToTable) return toast.error('Vui lòng chọn bàn đích!');
                        try {
                            const response = await fetch('/api/tables/move-table', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`
                                },
                                body: JSON.stringify({
                                    fromTable: selectedTable.tableNumber,
                                    toTable: moveToTable
                                })
                            });
                            const data = await response.json();
                            if (data.success) {
                                toast.success(data.message);
                                setShowMoveModal(false);
                                fetchTables();
                                emitTableChange();
                            } else {
                                toast.error(data.message || 'Lỗi khi chuyển bàn');
                            }
                        } catch (e) {
                            toast.error('Lỗi kết nối server');
                        }
                    }}>Xác nhận chuyển</Button>
                </Modal.Footer>
            </Modal>
            <Modal show={showMergeBillsModal} onHide={() => { setShowMergeBillsModal(false); setSlaveTablesToMerge([]); }}>
                <Modal.Header closeButton>
                    <Modal.Title>Gộp Hóa Đơn - Bàn {selectedMergeBillsTable}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="alert alert-info">
                        Chọn các bàn khác để gộp chung hóa đơn. (Sẽ thanh toán một lần tại Bàn {selectedMergeBillsTable})
                    </div>
                    <Form.Group>
                        <Form.Label>Chọn các bàn cần gộp</Form.Label>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {tables.filter(t =>
                                t.status === 'Đang sử dụng' &&
                                !t.merged_into &&
                                t.hasOrders &&
                                !t.isPaid &&
                                t.tableNumber !== selectedMergeBillsTable
                            ).map(t => (
                                <Form.Check
                                    key={t._id}
                                    type="checkbox"
                                    id={`merge-bill-${t.tableNumber}`}
                                    label={`Bàn ${t.tableNumber} - ${t.location}`}
                                    checked={slaveTablesToMerge.includes(t.tableNumber)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSlaveTablesToMerge([...slaveTablesToMerge, t.tableNumber]);
                                        } else {
                                            setSlaveTablesToMerge(slaveTablesToMerge.filter(tb => tb !== t.tableNumber));
                                        }
                                    }}
                                />
                            ))}
                            {tables.filter(t =>
                                t.status === 'Đang sử dụng' &&
                                !t.merged_into &&
                                t.hasOrders &&
                                !t.isPaid &&
                                t.tableNumber !== selectedMergeBillsTable
                            ).length === 0 && (
                                    <div className="text-muted fst-italic">Không có bàn nào khác đang sử dụng có thể gộp.</div>
                                )}
                        </div>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowMergeBillsModal(false); setSlaveTablesToMerge([]); }}>Đóng</Button>
                    <Button variant="primary" onClick={handleMergeBillsSubmit}>Xác nhận Gộp Bill</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TableManagement;