import React, { useState, useEffect } from 'react';
import { Table as BootstrapTable, Button, Modal, Form, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllTables, createReservation, getReservationByTableId } from '../../../actions/table';
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
  const [bookedDates, setBookedDates] = useState([]);

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

  const handleReservation = async (table) => {
    if (!accessToken) {
      navigate('/login', { state: { from: '/reservation' } });
      return;
    }
    setSelectedTable(table);
    setBookedDates([]);
    setShowModal(true);

    try {
      const res = await getReservationByTableId(accessToken, table._id);
      if (res && Array.isArray(res)) {
        const dates = res
          .filter(r => !['Đã hủy', 'Hoàn thành'].includes(r.status))
          .map(r => r.use_date.split('T')[0]);
        setBookedDates(dates);
      }
    } catch (e) {
      console.error(e);
    }
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

    const selectedDateStr = formData.use_date;
    if (bookedDates.includes(selectedDateStr)) {
      toast.error("Bàn đã được đặt trong ngày này, vui lòng chọn ngày trống trên lịch.");
      return;
    }

    const [hours, minutes] = formData.use_time.split(':').map(Number);
    if (hours < 8 || hours >= 20) {
      toast.error("Thời gian đặt bàn phải từ 08:00 đến 20:00.");
      return;
    }

    setIsLoading(true);

    try {

      const reservationTime = new Date(
        `${formData.use_date}T${formData.use_time}`
      );
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      if (reservationTime < thirtyMinutesFromNow) {
        toast.error("Quý khách phải đặt bàn trước ít nhất 30 phút để nhà hàng sắp xếp tốt nhất.");
        setIsLoading(false);
        return;
      }

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
      <h2 className="mb-4" style={{ paddingTop: "80px", color: "green" }}>Danh sách bàn</h2>

      <BootstrapTable striped bordered hover>
        <thead>
          <tr>
            <th>Số bàn</th>
            <th>Sức chứa</th>
            <th>Vị trí</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {tables.map((table) => (
            <tr key={table._id}>
              <td>Bàn {table.tableNumber}</td>
              <td>{table.seatingCapacity} người</td>
              <td>{table.location}</td>
              <td>
                <Button
                  variant="primary"
                  onClick={() => handleReservation(table)}
                >
                  Đặt bàn
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </BootstrapTable>

      {/* Modal đặt bàn */}
      <Modal
        show={showModal}
        onHide={() => !isLoading && setShowModal(false)}
        size="lg"
        centered
        contentClassName="reservation-modal-content"
      >
        <Modal.Header closeButton={!isLoading}>
          <Modal.Title>Đặt bàn {selectedTable?.tableNumber}</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ overflowY: 'hidden', padding: '1.5rem' }}>
          <Form onSubmit={handleSubmit}>
            <Row>
              {/* Lịch bên trái */}
              <Col md={5}>
                <div className="mb-3">
                  <Form.Label className="fw-bold" style={{ fontSize: '13px' }}>(Đỏ = Đã đặt, Xanh = Trống)</Form.Label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px',
                    marginBottom: '10px',
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>{d}</div>)}

                    {Array.from({ length: (new Date()).getDay() }).map((_, i) => <div key={`empty-${i}`}></div>)}

                    {Array.from({ length: 30 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(new Date().getDate() + i);

                      const tzoffset = d.getTimezoneOffset() * 60000;
                      const localISOTime = new Date(d.getTime() - tzoffset).toISOString().split('T')[0];

                      const isBooked = bookedDates.includes(localISOTime);
                      return (
                        <div
                          key={localISOTime}
                          style={{
                            padding: '6px 2px',
                            textAlign: 'center',
                            backgroundColor: isBooked ? '#dc3545' : '#5ab56fff',
                            color: 'white',
                            borderRadius: '3px',
                            opacity: isBooked ? 0.6 : 1,
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          {d.getDate()}/{d.getMonth() + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Col>

              {/* Form nhập bên phải */}
              <Col md={7}>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-2">
                      <Form.Label style={{ fontSize: '14px' }}>Số bàn</Form.Label>
                      <Form.Control
                        type="text"
                        value={selectedTable?.tableNumber || ''}
                        disabled
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-2">
                      <Form.Label style={{ fontSize: '14px' }}>Họ và tên</Form.Label>
                      <Form.Control
                        type="text"
                        value={`${user?.first_name || ''} ${user?.last_name || ''}`}
                        disabled
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-2">
                      <Form.Label style={{ fontSize: '14px' }}>Số điện thoại</Form.Label>
                      <Form.Control
                        type="tel"
                        value={user?.phone || ''}
                        disabled
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-2">
                      <Form.Label style={{ fontSize: '14px' }}>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={user?.email || ''}
                        disabled
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-2">
                      <Form.Label style={{ fontSize: '14px' }}>Ngày sử dụng</Form.Label>
                      <Form.Control
                        type="date"
                        name="use_date"
                        min={new Date().toISOString().split("T")[0]}
                        value={formData.use_date}
                        onChange={handleInputChange}
                        required
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-2">
                      <Form.Label style={{ fontSize: '14px' }}>Giờ sử dụng</Form.Label>
                      <Form.Control
                        type="time"
                        name="use_time"
                        value={formData.use_time}
                        onChange={handleInputChange}
                        required
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '14px' }}>Yêu cầu đặc biệt</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    rows={2}
                    size="sm"
                  />
                </Form.Group>

                <div className="d-flex justify-content-end mt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isLoading}
                    className="w-100"
                    style={{ height: '40px', fontSize: '16px', fontWeight: 'bold' }}
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
                </div>
              </Col>
            </Row>
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