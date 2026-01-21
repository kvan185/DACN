import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Button, Table, Modal, Form } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketIOClient from 'socket.io-client';
import './table.scss';
import { completeReservation } from '../../../actions/table.js';

const TableManagement = () => {
    const [tables, setTables] = useState([]);
    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newTable, setNewTable] = useState({
        tableNumber: '',
        seatingCapacity: 1,
        location: 'Tầng 1 trong nhà',
        isAvailable: true
    });
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewTable, setViewTable] = useState(null);
    const [reservationInfo, setReservationInfo] = useState(null);
    const [socketTables, setSocketTables] = useState([]);
    const socketRef = useRef();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const SOCKET_SERVER_URL = 'http://localhost:3000';
    const CLIENT_URL = window.location.origin;

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
                const response = await fetch(`/api/tables/${tableId}`, {method: 'DELETE'});
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
            setReservationInfo(data);
        } catch (error) {
            console.error("Error fetching reservation:", error);
            setReservationInfo(null);
        }
    };

    const handleShowViewModal = (table) => {
        setViewTable(table);
        setShowViewModal(true);
        if (!table.isAvailable) {
            fetchReservationInfo(table._id);
        } else {
            setReservationInfo(null);
        }
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

    const handleStartUsingTable = async (tableId) => {
        if (window.confirm('Xác nhận chuyển trạng thái bàn sang đang sử dụng?')) {
            try {
                const response = await fetch(`/api/tables/${tableId}/start-using`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error('Lỗi khi cập nhật trạng thái bàn');
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
                return 'bg-success';
            case 'Đã đặt':
                return 'bg-danger';
            case 'Đang sử dụng':
                return 'bg-warning text-dark';
            default:
                return 'bg-secondary';
        }
    };

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
      <div className="table-management">
          <div className="table-management__header">
              <h1>Quản lý bàn</h1>
              <Button className="btn-add" onClick={handleShowAddModal}>Thêm bàn</Button>
          </div>

          <ToastContainer 
              position="top-right"
              autoClose={3000}
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

            <Table striped bordered hover className="mt-3">
                <thead>
                    <tr>
                        <th>Số bàn</th>
                        <th>Trạng thái</th>
                        <th>Sức chứa</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {tables.map((table) => (
                        <tr key={table._id}>
                            <td>Bàn {table.tableNumber}</td>
                            <td>
                                <span className={`badge ${getStatusBadgeClass(table.status)}`}>
                                    {table.status}
                                </span>
                            </td>
                            <td>{table.seatingCapacity}</td>
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
                                            onClick={() => handleStartUsingTable(table._id)}
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
                        </tr>
                    ))}
                </tbody>
            </Table>

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
            <Modal show={showViewModal} onHide={handleCloseViewModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Chi tiết bàn</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewTable && (
                        <div className="table-details">
                            <div className="info-section">
                                <h5>Thông tin bàn</h5>
                                <p><strong>Số bàn:</strong> Bàn {viewTable.tableNumber}</p>
                                <p><strong>Trạng thái:</strong> {viewTable.isAvailable ? "Còn trống" : "Đã đặt"}</p>
                                <p><strong>Sức chứa:</strong> {viewTable.seatingCapacity} người</p>
                                <p><strong>Vị trí:</strong> {viewTable.location}</p>
                            </div>
                            
                            {!viewTable.isAvailable && reservationInfo && (
                                <div className="reservation-section mt-4">
                                    <h5>Thông tin đặt bàn</h5>
                                    <p><strong>Tên khách hàng:</strong> {reservationInfo.customerName}</p>
                                    <p><strong>Số điện thoại:</strong> {reservationInfo.phoneNumber}</p>
                                    <p><strong>Thời gian đặt:</strong> {new Date(reservationInfo.createdAt).toLocaleString()}</p>
                                    {reservationInfo.specialRequests && (
                                        <p><strong>Yêu cầu đặc biệt:</strong> {reservationInfo.specialRequests}</p>
                                    )}
                                </div>
                            )}
                            
                            <div className="qr-section mt-4">
                                <h5>Mã QR</h5>
                                <div className="d-flex justify-content-center">
                                    <QRCodeSVG
                                        value={`${CLIENT_URL}/menu?table=${viewTable.tableNumber}`}
                                        size={200}
                                        level="H"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseViewModal}>
                        Đóng
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={() => {
                            handleDeleteTable(viewTable._id);
                            handleCloseViewModal();
                        }}
                    >
                        Xóa bàn
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TableManagement;