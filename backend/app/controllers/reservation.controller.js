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
      from: `"Nhà hàng" HeathyFood`, // Thêm tên người gửi
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
    // 1. Kiểm tra đăng nhập
    const auth = await middlewares.checkAuth(req);
    if (!auth) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập để đặt bàn"
      });
    }

    const { tableId, specialRequests, use_date, use_time } = req.body;
    if (!tableId || !use_date || !use_time) {
      return res.status(400).json({
        message: "Thiếu thông tin đặt bàn"
      });
    }

    // 2. Kiểm tra bàn tồn tại
    const table = await Table.findById(tableId);

    if (!table) {
      console.log("❌ Không tìm thấy bàn");
      return res.status(404).json({
        message: "Bàn không tồn tại"
      });
    }

    // 3. Kiểm tra valid time (08:00 - 20:00)
    const [hours, minutes] = use_time.split(':').map(Number);
    if (hours < 8 || hours >= 20) {
      return res.status(400).json({
        message: "Thời gian đặt bàn phải từ 08:00 đến 20:00"
      });
    }
 
    const reservationTime = new Date(`${use_date}T${use_time}`);
    const now = new Date();

    if (reservationTime < now) {
      return res.status(400).json({
        message: "Thời gian đặt bàn không được ở trong quá khứ"
      });
    }

    // 4. Kiểm tra trùng ngày
    console.log("Đang kiểm tra trùng lịch đặt ngày: ", use_date);

    const existingReservation = await Reservation.findOne({
      tableId: tableId,
      use_date: new Date(use_date).toISOString().split('T')[0] + "T00:00:00.000Z",
      status: { $nin: ['Đã hủy', 'Hoàn thành'] }
    });

    if (existingReservation) {
      console.log("❌ Bàn đã được đặt vào thời gian này");
      return res.status(400).json({
        message: "Bàn đã được đặt vào thời gian này"
      });
    }
    // 5. Tạo mã xác nhận
    const confirmationCode = Reservation.generateConfirmationCode();
    console.log("Mã xác nhận:", confirmationCode);

    // 6. Tạo reservation
    const reservation = new Reservation({
      customerId: auth.id,
      customerName: `${auth.first_name} ${auth.last_name}`,
      phoneNumber: auth.phone,
      email: auth.email,
      tableId: tableId,
      specialRequests: specialRequests,
      use_date: use_date,
      use_time: use_time,
      reservationTime: new Date(`${use_date}T${use_time}`),
      confirmationCode: confirmationCode,
      status: "Đã đặt"
    });

    const savedReservation = await reservation.save();
    
    // Khách hàng có thể đặt bàn ngày khác nên ta không update table.isAvailable = false nữa.
    // 9. Gửi email xác nhận
    try {
      await sendConfirmationEmail(
        auth.email,
        confirmationCode,
        `${auth.first_name} ${auth.last_name}`
      );

    } catch (emailError) {

      console.log("⚠ Không gửi được email:", emailError.message);

    }

    // 10. Trả kết quả
    res.status(200).json({
      message: "Đặt bàn thành công. Mã xác nhận đã được gửi tới email của bạn.",
      reservation: savedReservation
    });

  } catch (error) {

    console.error("❌ LỖI KHI TẠO ĐẶT BÀN:", error);

    res.status(500).json({
      message: "Có lỗi xảy ra khi đặt bàn",
      error: error.message
    });

  }
};
exports.completeReservation = async (req, res) => {
  try {
    const { tableId } = req.params;

    // Cập nhật trạng thái reservation thành 'Hoàn thành' cho ngày hôm nay
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISO = new Date(Date.now() - tzoffset).toISOString().split('T')[0];
    const todayDateQuery = new Date(localISO + "T00:00:00.000Z");

    await Reservation.findOneAndUpdate(
      { tableId: tableId, use_date: todayDateQuery, status: 'Đang sử dụng' },
      { status: 'Hoàn thành' }
    );

    // Giải phóng bàn
    await db.table.findByIdAndUpdate(tableId, {
      status: 'Trống',
      isAvailable: true
    });

    res.status(200).send({ message: 'Đã hoàn tất và giải phóng bàn thành công' });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
}

exports.getReservationByTableId = async (req, res) => {
  try {
    const reservations = await Reservation.find({ 
      tableId: req.params.tableId,
      status: { $ne: 'Đã hủy' }
    });
    res.status(200).send(reservations);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
}

// Xử lý checkin bàn đã đặt
exports.checkinReservation = async (req, res) => {
  try {

    const { tableId } = req.params;
    const { confirmationCode } = req.body;

    const table = await Table.findById(tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bàn"
      });
    }

    const reservation = await Reservation.findOne({
      tableId: tableId,
      confirmationCode: confirmationCode,
      status: "Đã đặt"
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin đặt bàn hoặc mã xác nhận không đúng"
      });
    }

    reservation.status = "Đang sử dụng";
    await reservation.save();

    await Table.findByIdAndUpdate(tableId, {
      status: "Đang sử dụng",
      isAvailable: false
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
                number: table.tableNumber,
                capacity: table.seatingCapacity,
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

exports.cancelReservation = async (req, res) => {
  try {

    const { reservationId } = req.params;

    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      return res.status(404).json({
        message: "Không tìm thấy đặt bàn"
      });
    }

    // Không cho hủy khi đang sử dụng
    if (reservation.status === "Đang sử dụng") {
      return res.status(400).json({
        message: "Không thể hủy bàn đang sử dụng"
      });
    }

    // Cập nhật trạng thái reservation
    reservation.status = "Đã hủy";
    await reservation.save();

    res.status(200).json({
      message: "Hủy bàn thành công"
    });

  } catch (error) {

    console.error("Lỗi khi hủy bàn:", error);

    res.status(500).json({
      message: "Có lỗi xảy ra khi hủy bàn"
    });

  }
};

exports.getReservationsByCustomer = async (req, res) => {
  try {

    const auth = await middlewares.checkAuth(req);

    if (!auth) {
      return res.status(401).json({
        message: "Authentication failed"
      });
    }

    const reservations = await Reservation.find({
      customerId: auth.id
    }).populate("tableId");

    res.status(200).json(reservations);

  } catch (error) {

    console.error("❌ Lỗi khi lấy lịch sử đặt bàn:", error);

    res.status(500).json({
      message: "An error occurred while processing your request.",
      error: error.message
    });

  }
};