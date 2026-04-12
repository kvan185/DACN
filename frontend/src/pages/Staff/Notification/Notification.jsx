import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import {
    FaBell,
    FaShoppingCart,
    FaExclamationTriangle,
    FaCheckCircle
} from "react-icons/fa";

import "./notification.scss";

function Notification() {

    const [notifications, setNotifications] = useState([]);

    useEffect(() => {

        // giả lập dữ liệu
        const data = [
            {
                id: 1,
                type: "order",
                message: "Có đơn hàng mới từ bàn số 5",
                time: "2 phút trước"
            },
            {
                id: 2,
                type: "warning",
                message: "Nguyên liệu 'Thịt bò' sắp hết",
                time: "10 phút trước"
            },
            {
                id: 3,
                type: "success",
                message: "Đơn hàng #1023 đã thanh toán",
                time: "30 phút trước"
            },
            {
                id: 4,
                type: "system",
                message: "Hệ thống đã được cập nhật",
                time: "1 giờ trước"
            }
        ];

        setNotifications(data);

    }, []);

    const renderIcon = (type) => {

        switch (type) {

            case "order":
                return <FaShoppingCart className="icon order" />

            case "warning":
                return <FaExclamationTriangle className="icon warning" />

            case "success":
                return <FaCheckCircle className="icon success" />

            default:
                return <FaBell className="icon system" />
        }
    };

    return (
        <div className="admin-notification">

            <Container>

                <div className="notification-header">
                    <FaBell />
                    <h2>Thông báo hệ thống</h2>
                </div>

                <div className="notification-list">

                    {notifications.map((item) => (

                        <div className="notification-item" key={item.id}>

                            <div className="notification-icon">
                                {renderIcon(item.type)}
                            </div>

                            <div className="notification-content">

                                <p className="message">
                                    {item.message}
                                </p>

                                <span className="time">
                                    {item.time}
                                </span>

                            </div>

                        </div>

                    ))}

                </div>

            </Container>

        </div>
    );
}

export default Notification;