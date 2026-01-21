require("dotenv").config();
const db = require("../models");
const Reservation = db.reservation;
const Table = db.table;
const nodemailer = require('nodemailer');
const middlewares = require("./auth.middlewares");

// Cấu hình nodemailer (thêm vào đầu file)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "khanhvan18052004@gmail.com",
    pass: "mshn wblf egva cdtm"
  }
});

// Thêm hàm kiểm tra kết nối chi tiết hơn
const verifyEmailConfig = async () => {
  try {
    console.log('Checking email configuration...');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass length:', process.env.EMAIL_PASS?.length);
    
    await transporter.verify();
    console.log('Email configuration is correct');
    return true;
  } catch (error) {
    console.error('Email configuration error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return false;
  }
};

// Hàm gửi email với xử lý lỗi tốt hơn
const sendConfirmationEmail = async (email, confirmationCode, customerName) => {
  try {
    // Kiểm tra cấu hình email trước khi gửi
    const isEmailConfigValid = await verifyEmailConfig();
    if (!isEmailConfigValid) {
      throw new Error('Cấu hình email không hợp lệ');
    }

    const mailOptions = {
      from: `"Nhà hàng" Nón Lá Burger`, // Thêm tên người gửi
      to: email,
      subject: 'Xác nhận đặt bàn',
      html: `
        <h2>Xin chào ${customerName},</h2>
        <p>Cảm ơn bạn đã đặt bàn tại nhà hàng chúng tôi.</p>
        <p>Mã xác nhận của bạn là: <strong>${confirmationCode}</strong></p>
        <p>Vui lòng giữ mã này để sử dụng khi check-in tại nhà hàng.</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    throw new Error('Không thể gửi email: ' + error.message);
  }
};

exports.createReservation = async (req, res) => {
  try {
    // Kiểm tra xác thực người dùng
    const auth = await middlewares.checkAuth(req);
    if (!auth) {
      return res.status(401).send({ message: "Vui lòng đăng nhập để đặt bàn" });
    }

    const confirmationCode = Reservation.generateConfirmationCode();
    const reservation = new Reservation({
      // Sử dụng thông tin từ người dùng đã đăng nhập
      customerId: auth.id,
      customerName: `${auth.first_name} ${auth.last_name}`, 
      phoneNumber: auth.phone,
      email: auth.email,
      tableId: req.body.tableId,
      specialRequests: req.body.specialRequests,
      confirmationCode: confirmationCode
    });

    // Kiểm tra bàn có sẵn không trước khi đặt
    const table = await Table.findById(req.body.tableId);
    if (!table || !table.isAvailable) {
      throw new Error('Bàn không khả dụng');
    }
    
    // Gửi email trước khi lưu reservation
    try {
      await sendConfirmationEmail(auth.email, confirmationCode, `${auth.first_name} ${auth.last_name}`);
    } catch (emailError) {
      console.error('Email error:', emailError);
      return res.status(500).send({
        message: "Không thể gửi email xác nhận. Vui lòng thử lại sau."
      });
    }

    // Lưu đặt bàn
    const savedReservation = await reservation.save();
    
    // Cập nhật trạng thái bàn
    table.isAvailable = false;
    await table.save();

    res.status(200).send({
      ...savedReservation._doc,
      message: `Đặt bàn thành công. Mã xác nhận đã được gửi đến email của bạn.`
    });
  } catch (error) {
    console.error('Reservation error:', error);
    res.status(400).send({
      message: error.message || "Có lỗi khi đặt bàn"
    });
  }
}

exports.completeReservation = async (req, res) => {
  try {
    const table = await Table.findById(req.params.tableId);
    table.isAvailable = true;
    table.status = 'Trống';
    await table.save();

    await Reservation.findOneAndDelete({ tableId: req.params.tableId });

    res.status(200).send({ message: 'Đã hoàn tất và giải phóng bàn thành công' });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
}

exports.getReservationByTableId = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ tableId: req.params.tableId });
    res.status(200).send(reservation);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
}

// Xử lý checkin bàn đã đặt
exports.checkinReservation = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        const { confirmationCode } = req.body;

        const table = await Table.findOne({ tableNumber: tableNumber });
        // Tìm reservation với tableId và confirmationCode
        const reservation = await Reservation.findOne({
            tableId: table._id,
            confirmationCode: confirmationCode,
            status: "Đã đặt" 
        });

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin đặt bàn hoặc mã xác nhận không đúng"
            });
        }

        // Cập nhật trạng thái reservation
        reservation.status = "Đang sử dụng";
        await reservation.save();

        // Cập nhật trạng thái bàn
        await Table.findByIdAndUpdate(table._id, {
            status: "Đang sử dụng",
        });

        res.json({
            success: true,
            message: "Checkin thành công",
            reservation
        });

    } catch (error) {
        console.error("Lỗi khi checkin:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xử lý checkin"
        });
    }
};

// Kiểm tra trạng thái bàn
exports.checkTableAvailability = async (req, res) => {
    try {
        const { tableNumber } = req.params;

        const table = await Table.findOne({ tableNumber: tableNumber });
        
        if (!table) {
            return res.status(404).json({
                statusCode: 404,
                success: false,
                message: "Không tìm thấy bàn"
            });
        }

        // Kiểm tra các điều kiện khả dụng
        const isAvailable = table.isAvailable;
        
        // Kiểm tra xem có đơn đặt trước nào đang chờ không
        const pendingReservation = await Reservation.findOne({
            tableId: table._id,
            status: "Đã đặt"
        });
        if (pendingReservation) {
          return res.status(400).json({
              statusCode: 400,
              success: false,
              message: "Bàn đã được đặt trước",
              table: {
                  number: table.number,
                  capacity: table.capacity,
                  status: table.status
              }
          });
      }

        if (!isAvailable) {
            return res.status(400).json({
                statusCode: 400,
                success: false,
                message: "Bàn đang được sử dụng",
                table: {
                    number: table.number,
                    capacity: table.capacity,
                    status: table.status
                }
            });
        }

        // Bàn khả dụng
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "Bàn khả dụng",
            table: {
                number: table.number,
                capacity: table.capacity,
                status: table.status
            }
        });

    } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái bàn:", error);
        return res.status(500).json({
            statusCode: 500,
            success: false,
            message: "Có lỗi xảy ra khi kiểm tra trạng thái bàn"
        });
    }
};
