import React, { useEffect, useState } from "react";

function ReservationHistory() {

    const [reservations, setReservations] = useState([]);

    const accessToken = JSON.parse(sessionStorage.getItem("accessToken"));

    useEffect(() => {

        const fetchReservations = async () => {

            const response = await fetch("http://localhost:5000/api/reservations/history", {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const data = await response.json();

            setReservations(data);

        };

        fetchReservations();

    }, []);

    return (
        <div>
            <h2>Lịch sử đặt bàn</h2>

            {reservations.map((item) => (
                <div key={item._id} className="reservation-item">

                    <p>Bàn: {item.tableId?.tableNumber}</p>

                    <p>
                        Thời gian đặt:
                        {new Date(item.reservationTime).toLocaleString()}
                    </p>

                    <p>Mã xác nhận: {item.confirmationCode}</p>

                    <p>Trạng thái: {item.status}</p>

                </div>
            ))}

        </div>
    );
}

export default ReservationHistory;