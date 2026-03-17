import React, { useState, useEffect } from 'react';
import { Table as BootstrapTable, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllTables, createReservation } from '../../../actions/table';
import PopupReserveSuccess from '../../../components/Customer/PopupReserveSuccess/PopupReserveSuccess';

  const TableReservation = () => {
  const navigate = useNavigate();
  const accessToken = sessionStorage.getItem("accessToken");
  const user = JSON.parse(sessionStorage.getItem("user"));

  const [tables, setTables] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    specialRequests: '',
    use_date: '',
    use_time: '',
  });

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const data = await getAllTables();
        if (data) {
          setTables(data);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu bàn:', error);
      }
    };

    fetchTables();
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleReservation = (table) => {
    if (!accessToken) {
      navigate('/login', { state: { from: '/reservation' } });
      return;
    }
    setSelectedTable(table);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {

    const reservationTime = new Date(
      `${formData.use_date}T${formData.use_time}`
    );

    const payload = {
      tableId: selectedTable._id,
      specialRequests: formData.specialRequests,
      use_date: formData.use_date,
      use_time: formData.use_time,
      reservationTime
    };

    // 🔎 log dữ liệu gửi lên backend
    console.log("Reservation payload:", payload);

    const result = await createReservation(accessToken, payload);

    // 🔎 log response từ backend
    console.log("Reservation response:", result);

    setShowModal(false);
    setSelectedTable(null);

    setFormData({
      use_date: '',
      use_time: '',
      specialRequests: ''
    });

    setShowSuccessPopup(true);

    const updatedTables = await getAllTables();
    setTables(updatedTables);

  } catch (error) {

    // 🔎 log lỗi chi tiết
    console.error("Reservation error:", error);

    toast.error(error.message || "Có lỗi khi đặt bàn");

  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="container mt-4">
      <h2 className="mb-4"  style={{ paddingTop: "80px", color: "green" }}>Danh sách bàn</h2>

      <BootstrapTable striped bordered hover>
        <thead>
          <tr>
            <th>Số bàn</th>
            <th>Trạng thái</th>
            <th>Sức chứa</th>
            <th>Vị trí</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {tables.map((table) => (
            <tr key={table._id}>
              <td>{table.tableNumber}</td>

              <td>
                <span className={`badge ${table.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                  {table.isAvailable ? 'Trống' : 'Đã đặt'}
                </span>
              </td>

              <td>{table.seatingCapacity} người</td>

              <td>{table.location}</td>

              <td>
                <Button
                  variant="primary"
                  onClick={() => handleReservation(table)}
                  disabled={!table.isAvailable}
                >
                  Đặt bàn
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </BootstrapTable>

      {/* Modal đặt bàn */}
      <Modal show={showModal} onHide={() => !isLoading && setShowModal(false)}>
        <Modal.Header closeButton={!isLoading}>
          <Modal.Title>Đặt bàn {selectedTable?.tableNumber}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmit}>

            <Form.Group className="mb-3">
              <Form.Label>Số bàn</Form.Label>
              <Form.Control
                type="text"
                value={selectedTable?.tableNumber || ''}
                disabled
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Họ và tên</Form.Label>
              <Form.Control
                type="text"
                value={`${user?.first_name || ''} ${user?.last_name || ''}`}
                disabled
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Số điện thoại</Form.Label>
              <Form.Control
                type="tel"
                value={user?.phone || ''}
                disabled
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={user?.email || ''}
                disabled
              />
            </Form.Group>
<Form.Group className="mb-3">
  <Form.Label>Ngày sử dụng bàn</Form.Label>
  <Form.Control
    type="date"
    name="use_date"
    min={new Date().toISOString().split("T")[0]}
    value={formData.use_date}
    onChange={handleInputChange}
    required
  />
</Form.Group>

<Form.Group className="mb-3">
  <Form.Label>Giờ sử dụng bàn</Form.Label>
  <Form.Control
    type="time"
    name="use_time"
    value={formData.use_time}
    onChange={handleInputChange}
    required
  />
</Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Yêu cầu đặc biệt</Form.Label>
              <Form.Control
                as="textarea"
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                rows={3}
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="w-100"
            >
              {isLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận đặt bàn'
              )}
            </Button>

          </Form>
        </Modal.Body>
      </Modal>

      {/* Popup thành công */}
      <PopupReserveSuccess
        show={showSuccessPopup}
        onHide={() => setShowSuccessPopup(false)}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <Spinner animation="border" variant="light" />
        </div>
      )}

    </div>
  );
};

export default TableReservation;