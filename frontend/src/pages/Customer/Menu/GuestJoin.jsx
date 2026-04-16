import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function GuestJoin({ show, tableNumber, onJoined }) {
    const [guests, setGuests] = useState([]);
    const [selectedGuest, setSelectedGuest] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem("user"));

    useEffect(() => {
        if (show && tableNumber) {
            // Load user profile if logged in
            if (user && user.first_name) {
                setNewUsername(user.first_name + ' ' + user.last_name);
                setPhoneCode(user.phone || '');
            }

            fetch(`/api/order/guest/table/${tableNumber}/active-guests`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.guests) {
                        setGuests(data.guests);
                    }
                });
            const savedSession = sessionStorage.getItem('guest_session');
            if (savedSession) {
                try {
                    const parsed = JSON.parse(savedSession);
                    if (parsed.table === tableNumber && parsed.username && parsed.code) {
                        onJoined(parsed.username, parsed.code, parsed.sessionId);
                    }
                } catch (e) {}
            }
        }
    }, [show, tableNumber]);

    const handleJoin = async () => {
        let username = selectedGuest || newUsername;
        if (!username) {
            alert('Vui lòng nhập tên hoặc chọn tên có sẵn');
            return;
        }

        const payload = {
            tableNumber: tableNumber,
            username: username,
            phoneCode: phoneCode
        };

        try {
            const response = await fetch('/api/order/guest/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                const sessionObj = { table: tableNumber, username: data.username, code: data.code, sessionId: data.sessionId };
                sessionStorage.setItem('guest_session', JSON.stringify(sessionObj));
                onJoined(data.username, data.code, data.sessionId);
            } else {
                alert(data.message || 'Lỗi xác thực');
            }
        } catch (error) {
            alert('Lỗi kết nối !');
        }
    };

    const handleLogin = () => {
        navigate('/login');
    }

    return (
        <Modal show={show} backdrop="static" keyboard={false} centered>
            <Modal.Header>
                <Modal.Title>Tham gia bàn {tableNumber}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {guests.length > 0 ? (
                    <Form.Group className="mb-3">
                        <Form.Label>Chọn tên khách đang tại bàn:</Form.Label>
                        <Form.Select value={selectedGuest} onChange={(e) => { setSelectedGuest(e.target.value); setNewUsername(''); }}>
                            <option value="">-- Tham gia mới --</option>
                            {guests.map((g, idx) => (
                                <option key={idx} value={g}>{g}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                ) : null}

                {!selectedGuest && (
                    <Form.Group className="mb-3">
                        <Form.Label>Tên hiển thị của bạn (Tên mới):</Form.Label>
                        <Form.Control type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Nhập tên gọi của bạn" />
                    </Form.Group>
                )}

                <Form.Group className="mb-3">
                    <Form.Label>{selectedGuest ? 'Nhập Số điện thoại xác thực:' : 'Nhập Số điện thoại (dùng làm mã phân biệt):'}</Form.Label>
                    <Form.Control type="text" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} placeholder="09xxxxxxx" />
                </Form.Group>
                
                {!user && (
                    <div className="text-center mt-3">
                        <Button variant="link" onClick={handleLogin}>Bạn đã có tài khoản ? Đăng nhập ngay</Button>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={handleJoin} className="w-100 fw-bold">Tham Gia Bàn</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default GuestJoin;
