import React, { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import moment from "moment";
import "./HistoryReservation.scss";
import Cart from "../../../components/Customer/Cart/Cart";

function ReservationHistory() {
  const [reservations, setReservations] = useState([]);
  const accessToken = sessionStorage.getItem('accessToken');
  useEffect(() => {
  if (!accessToken) return;
    const fetchReservations = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/reservations/history",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message);
        }

        setReservations(data);

      } catch (error) {
        console.error("Lỗi khi lấy lịch sử đặt bàn:", error);
      }

    };

    fetchReservations();

  }, [accessToken]);



  const handleCancelReservation = async (reservationId) => {

    try {

      const res = await fetch(
        `http://localhost:5000/api/reservations/${reservationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      alert("Hủy bàn thành công");

      setReservations(prev =>
        prev.filter(r => r._id !== reservationId)
      );

    } catch (error) {
      console.error("Lỗi khi hủy bàn:", error);
    }

  };

  return (
    <>
      {accessToken && <Cart accessToken={accessToken} />}

      <div className="block__history-reservation">
        <Container>

          <h2>Lịch sử đặt bàn</h2>

          <div className="reservation-list">

            {reservations.length === 0 && (
              <p>Không có lịch sử đặt bàn</p>
            )}

            {reservations.map((items) => {

              const {
                _id,
                customerName,
                confirmationCode,
                phoneNumber,
                email,
                tableId,
                status,
                specialRequests,
                createdAt,
                reservationTime
              } = items;

              return (
                <div className="reservation-item" key={_id}>

                  <div className="reservation-head">
                    <label>
                      Mã xác nhận: <span>#{confirmationCode}</span>
                    </label>

                    <label>
                      Ngày đặt:
                      <span className="reservation-time">
                        {moment(createdAt).format("DD-MM-YYYY HH:mm")}
                      </span>
                    </label>
                  </div>

                  <div className="info">
                    <div className="reservation-info">

                      <Row>

                        <Col md={4}>
                          <label>
                            Tên khách hàng: <span>{customerName}</span>
                          </label>
                        </Col>

                        <Col md={4}>
                          <label>
                            Số điện thoại: <span>{phoneNumber}</span>
                          </label>
                        </Col>

                        <Col md={4}>
                          <label>
                            Email: <span>{email}</span>
                          </label>
                        </Col>

                        <Col md={4}>
                          <label>
                            Bàn đã đặt:
                            <span>
                              {tableId?.tableNumber || "Không xác định"}
                            </span>
                          </label>
                        </Col>

                        <Col md={4}>
                          <label>
                            Ngày sử dụng:
                            <span>
                              {reservationTime
                                ? moment(reservationTime).format("DD-MM-YYYY HH:mm")
                                : "Không xác định"}
                            </span>
                          </label>
                        </Col>

                      </Row>

                    </div>
                  </div>

                  <div className="reservation-request">
                    <label>
                      (*) Yêu cầu đặc biệt:
                      <span>{specialRequests || "Không có"}</span>
                    </label>
                  </div>

                  <div className="reservation-footer">

                    <span className="reservation-status confirmed">
                      <i className="fa-solid fa-check"></i> {status}
                    </span>

                    {status === "Đã đặt" && (
                      <button
                        className="btn-cancel"
                        onClick={() => handleCancelReservation(_id)}
                      >
                        Hủy bàn
                      </button>
                    )}

                  </div>

                </div>
              );

            })}

          </div>

        </Container>
      </div>
    </>
  );

}

export default ReservationHistory;