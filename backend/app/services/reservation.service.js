require("dotenv").config();
const db = require("../models");
const Reservation = db.reservation;
const Table = db.table;
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        return true;
    } catch (error) {
        console.error("Email config error:", error);
        return false;
    }
};

const sendConfirmationEmail = async (email, code, name) => {
    const isValid = await verifyEmailConfig();
    if (!isValid) throw new Error("Cấu hình email không hợp lệ");

    const mailOptions = {
        from: `"Nhà hàng" HeathyFood`,
        to: email,
        subject: "Xác nhận đặt bàn",
        html: `
      <h2>Xin chào ${name},</h2>
      <p>Mã xác nhận của bạn là: <strong>${code}</strong></p>
    `,
    };

    await transporter.sendMail(mailOptions);
};

exports.createReservation = async (auth, data) => {
    const { tableId, specialRequests, use_date, use_time } = data;

    if (!tableId || !use_date || !use_time) {
        throw { status: 400, message: "Thiếu thông tin đặt bàn" };
    }

    const table = await Table.findById(tableId);
    if (!table) throw { status: 404, message: "Bàn không tồn tại" };

    if (!table.isAvailable) {
        throw { status: 400, message: "Bàn hiện không khả dụng" };
    }

    const existing = await Reservation.findOne({
        tableId,
        use_date,
        use_time,
    });

    if (existing) {
        throw { status: 400, message: "Bàn đã được đặt vào thời gian này" };
    }

    const code = Reservation.generateConfirmationCode();

    const reservation = new Reservation({
        customerId: auth.id,
        customerName: `${auth.first_name} ${auth.last_name}`,
        phoneNumber: auth.phone,
        email: auth.email,
        tableId,
        specialRequests,
        use_date,
        use_time,
        reservationTime: new Date(`${use_date}T${use_time}`),
        confirmationCode: code,
        status: "Đã đặt",
    });

    const saved = await reservation.save();

    table.isAvailable = false;
    table.status = "Đã đặt";
    await table.save();

    try {
        await sendConfirmationEmail(
            auth.email,
            code,
            `${auth.first_name} ${auth.last_name}`
        );
    } catch (e) {
        console.log("⚠ Không gửi được email:", e.message);
    }

    return saved;
};

exports.completeReservation = async (tableId) => {
    const table = await Table.findById(tableId);
    table.isAvailable = true;
    table.status = "Trống";
    await table.save();

    await Reservation.findOneAndDelete({ tableId });

    return true;
};

exports.getReservationByTableId = async (tableId) => {
    return await Reservation.findOne({ tableId });
};

exports.checkinReservation = async (tableId, confirmationCode) => {
    const table = await Table.findById(tableId);
    if (!table) throw { status: 404, message: "Không tìm thấy bàn" };

    const reservation = await Reservation.findOne({
        tableId,
        confirmationCode,
        status: "Đã đặt",
    });

    if (!reservation) {
        throw {
            status: 404,
            message: "Mã xác nhận không đúng",
        };
    }

    reservation.status = "Đang sử dụng";
    await reservation.save();

    await Table.findByIdAndUpdate(tableId, {
        status: "Đang sử dụng",
        isAvailable: false,
    });

    return reservation;
};

exports.checkTableAvailability = async (tableNumber) => {
    const table = await Table.findOne({ tableNumber });
    if (!table) throw { status: 404, message: "Không tìm thấy bàn" };

    const pending = await Reservation.findOne({
        tableId: table._id,
        status: "Đã đặt",
    });

    if (pending) {
        throw { status: 400, message: "Bàn đã được đặt trước", table };
    }

    if (!table.isAvailable) {
        throw { status: 400, message: "Bàn đang được sử dụng", table };
    }

    return table;
};

exports.cancelReservation = async (reservationId) => {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw { status: 404, message: "Không tìm thấy đặt bàn" };

    if (reservation.status === "Đang sử dụng") {
        throw { status: 400, message: "Không thể hủy bàn đang sử dụng" };
    }

    reservation.status = "Đã hủy";
    await reservation.save();

    await Table.findByIdAndUpdate(reservation.tableId, {
        isAvailable: true,
        status: "Trống",
    });

    return true;
};

exports.getReservationsByCustomer = async (customerId) => {
    return await Reservation.find({ customerId }).populate("tableId");
};