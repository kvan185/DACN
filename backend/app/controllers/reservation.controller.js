const reservationService = require("../services/reservation.service");
const middlewares = require("./auth.middlewares");

const handleError = (res, error) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Lỗi server",
  });
};

exports.createReservation = async (req, res) => {
  try {
    const auth = await middlewares.checkAuth(req);
    if (!auth) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const result = await reservationService.createReservation(auth, req.body);

    res.status(200).json({
      message: "Đặt bàn thành công",
      reservation: result,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.completeReservation = async (req, res) => {
  try {
    await reservationService.completeReservation(req.params.tableId);
    res.json({ message: "Đã hoàn tất" });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getReservationByTableId = async (req, res) => {
  try {
    const data = await reservationService.getReservationByTableId(
      req.params.tableId
    );
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.checkinReservation = async (req, res) => {
  try {
    const result = await reservationService.checkinReservation(
      req.params.tableId,
      req.body.confirmationCode
    );

    res.json({
      success: true,
      reservation: result,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.checkTableAvailability = async (req, res) => {
  try {
    const table = await reservationService.checkTableAvailability(
      req.params.tableNumber
    );

    res.json({
      success: true,
      table,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    await reservationService.cancelReservation(req.params.reservationId);
    res.json({ message: "Hủy thành công" });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getReservationsByCustomer = async (req, res) => {
  try {
    const auth = await middlewares.checkAuth(req);
    if (!auth) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    const data = await reservationService.getReservationsByCustomer(auth.id);
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};