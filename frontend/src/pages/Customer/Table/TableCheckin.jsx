import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getReservationByTableId, checkinReservation, checkTableAvailability } from '../../../actions/table';

const TableCheckin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [tableId, setTableId] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [key, setKey] = useState('direct');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tableNumber = params.get('table_number');
    
    if (tableNumber) {
      setTableId(tableNumber);
      toast.info(`Đang kiểm tra thông tin bàn số ${tableNumber}`);
      handleQRCheckin(tableNumber);
    }
  }, [location.search]);

  const handleQRCheckin = async (tableNumber) => {
    setIsLoading(true);
    try {
      const availability = await checkTableAvailability(tableNumber);
      
      if (!availability.success) {
        toast.error(availability.message);
        return;
      }

      toast.success('Xác nhận bàn thành công! Đang chuyển đến trang đặt món...');
      setTimeout(() => {
        navigate(`/menu?table=${tableNumber}`);
      }, 1500);
    } catch (error) {
      console.error('Lỗi:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xác nhận bàn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectCheckin = async (e) => {
    e.preventDefault();
    
    // Kiểm tra xác thực
    const accessToken = JSON.parse(sessionStorage.getItem('accessToken'));
    if (!accessToken) {
        navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
        return;
    }
    
    setIsLoading(true);
    
    try {
      const availability = await checkTableAvailability(tableId);
      
      if (!availability.success) {
        toast.error(availability.message);
        return;
      }

      toast.success('Xác nhận bàn thành công! Đang chuyển đến trang đặt món...');
      setTimeout(() => {
        navigate(`/menu?table=${tableId}`);
      }, 1500);
    } catch (error) {
      console.error('Lỗi:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xác nhận bàn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReservedCheckin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await checkinReservation(tableId, confirmationCode);
      
      if (result.success) {
        toast.success('Xác nhận đặt bàn thành công! Đang chuyển đến trang đặt món...');
        setTimeout(() => {
          navigate(`/menu?table=${tableId}`);
        }, 1500);
      } else {
        toast.error(result.message || 'Thông tin đặt bàn không chính xác');
      }
    } catch (error) {
      console.error('Lỗi:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xác nhận');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <Container className="py-5">
        <div className="max-w-md mx-auto">
          <h2 className="text-center mb-4">Xác Nhận Bàn</h2>

          <Tabs
            activeKey={key}
            onSelect={(k) => setKey(k)}
            className="mb-4"
          >
            <Tab eventKey="direct" title="Khách Trực Tiếp">
              <Form onSubmit={handleDirectCheckin}>
                <Form.Group className="mb-3">
                  <Form.Label>Số bàn</Form.Label>
                  <Form.Control
                    type="text"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    placeholder="Nhập số bàn"
                    required
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2"/>
                      Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận bàn'
                  )}
                </Button>
              </Form>
            </Tab>

            <Tab eventKey="reserved" title="Khách Đặt Trước">
              <Form onSubmit={handleReservedCheckin}>
                <Form.Group className="mb-3">
                  <Form.Label>Số bàn</Form.Label>
                  <Form.Control
                    type="text"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    placeholder="Nhập số bàn"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Mã xác nhận</Form.Label>
                  <Form.Control
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="Nhập mã xác nhận từ email"
                    required
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2"/>
                      Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận đặt bàn'
                  )}
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </div>
      </Container>
    </>
  );
};

export default TableCheckin; 