const db = require("../models");
const Table = db.table;
const QRCode = require('qrcode');

// Lấy thông tin bàn theo mã QR
exports.getTableByQRCode = async (req, res) => {
  try {
    const qrCode = req.params.qrCode;
    const table = await Table.findOne({ qrCode });

    if (!table) {
      return res.status(404).json({ message: 'Bàn không tồn tại.' });
    }

    if (!table.isAvailable) {
      return res.status(400).json({ message: 'Bàn đã được đặt hoặc không thể sử dụng' });
    }

    res.json(table);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// Thêm bàn mới
exports.addTable = async (req, res) => {
  try {
    const { tableNumber, seatingCapacity, location } = req.body;
    if (!tableNumber || !seatingCapacity || !location) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    if (seatingCapacity < 1) {
      return res.status(400).json({ message: 'Sức chứa phải lớn hơn 0.' });
    }
    const newTable = new Table({ tableNumber, seatingCapacity, location });
    console.log(tableNumber, seatingCapacity, location);
    await newTable.save();
    // Tạo URL cho menu với tên bàn
    const menuUrl = `${process.env.FRONTEND_URL}/menu?table=${tableNumber}`;

    // Tạo mã QR từ URL menu
    const qrCodeDataURL = await QRCode.toDataURL(menuUrl);

    // Cập nhật mã QR vào bảng
    newTable.qrCode = qrCodeDataURL;
    await newTable.save();

    res.status(201).json(newTable);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.tableNumber) {
      return res.status(400).json({ message: 'Số bàn đã tồn tại' });
    }
    console.error(error);
    res.status(400).json({ message: 'Lỗi khi thêm bàn mới.' });
  }
};

// Sửa thông tin bàn
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    console.log(updatedData);
    const updatedTable = await Table.findByIdAndUpdate(id, updatedData, { new: true });
    if (!updatedTable) {
      return res.status(404).json({ message: 'Bàn không tồn tại.' });
    }
    res.json(updatedTable);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Lỗi khi cập nhật thông tin bàn.' });
  }
};

// Xóa bàn
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTable = await Table.findByIdAndDelete(id);
    if (!deletedTable) {
      return res.status(404).json({ message: 'Bàn không tồn tại.' });
    }
    res.json({ message: 'Xóa bàn thành công.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi xóa bàn.' });
  }
};

exports.getTablesListInternal = async () => {
  const tables = await Table.aggregate([
    {
      $lookup: {
        from: 'reservations',
        localField: '_id',
        foreignField: 'tableId',
        as: 'reservationList'
      }
    },
    { $sort: { tableNumber: 1 } }
  ]);

  // Tìm các lịch đặt bàn của ngày hôm nay
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const localISO = new Date(Date.now() - tzoffset).toISOString().split('T')[0];
  const todayDateQuery = new Date(localISO + "T00:00:00.000Z");

  const now = new Date();
  const expiryLimit = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Giữ bàn trong 2 tiếng

  // Tự động hủy các đơn đặt bàn quá 2 tiếng
  await db.reservation.updateMany(
    {
      use_date: todayDateQuery,
      status: 'Đã đặt',
      reservationTime: { $lt: expiryLimit }
    },
    { status: 'Đã hủy' }
  );

  const todayReservations = await db.reservation.find({
    use_date: todayDateQuery,
    status: { $nin: ['Đã hủy', 'Hoàn thành'] }
  });

  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  return tables.map(table => {
    // Trong hàm aggregate, document trả về đã là plain JS object
    const t = { ...table };
    t.note = ""; // Khởi tạo ghi chú trống
    t.nextReservationTime = null;

    // Tìm reservation của bàn này trong hôm nay (không bao gồm 'Đã hủy', 'Hoàn thành')
    const res = todayReservations.find(r => r.tableId.toString() === t._id.toString());

    if (res) {
      t.confirmationCode = res.confirmationCode;
      t.customerName = res.customerName; // optionally add customerName 
      const resTime = new Date(res.reservationTime);
      const diffMs = resTime - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      if (resTime <= oneHourFromNow) {
        t.nextReservationTime = res.reservationTime;
        t.holdExpiryTime = new Date(resTime.getTime() + 2 * 60 * 60 * 1000);

        if (t.status === 'Đang sử dụng') {
          t.note = "Sắp đến giờ đặt bàn của khách, mau chóng xử lý!";
        } else {
          t.status = 'Đã đặt';
          t.isAvailable = false;
          t.note = "Bàn đang giữ chỗ";
        }
      } else {
        // Ngoài khoảng 1 tiếng, nếu không đang sử dụng thì là Trống
        if (t.status !== 'Đang sử dụng') {
          t.status = 'Trống';
          t.isAvailable = true;
        }
      }
    } else {
      // Không có reservation, nếu không đang sử dụng thì là Trống
      if (t.status !== 'Đang sử dụng') {
        t.status = 'Trống';
        t.isAvailable = true;
      }
    }
    return t;
  });
};

exports.getAllTables = async (req, res) => {
  try {
    const result = await exports.getTablesListInternal();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi lấy tất cả bàn.' });
  }
};

exports.startUsingTable = async (req, res) => {
  try {
    const { id } = req.params;

    // Cập nhật trạng thái reservation nếu có cho ngày hôm nay
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISO = new Date(Date.now() - tzoffset).toISOString().split('T')[0];
    const todayDateQuery = new Date(localISO + "T00:00:00.000Z");
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const reservation = await db.reservation.findOne({
      tableId: id,
      use_date: todayDateQuery,
      status: 'Đã đặt',
      reservationTime: { $lte: oneHourFromNow }
    });

    if (reservation) {
      const now = new Date();
      const expiryTime = new Date(reservation.reservationTime.getTime() + 2 * 60 * 60 * 1000);

      if (now > expiryTime) {
        reservation.status = 'Đã hủy';
        await reservation.save();
        return res.status(400).json({ message: 'Đã quá thời gian nhận bàn (quá 3 tiếng).' });
      }

      reservation.status = 'Đang sử dụng';
      await reservation.save();
    }

    const updatedTable = await Table.findByIdAndUpdate(
      id,
      {
        status: 'Đang sử dụng',
        isAvailable: false
      },
      { new: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ message: 'Bàn không tồn tại.' });
    }

    res.json(updatedTable);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Lỗi khi cập nhật trạng thái bàn.' });
  }
};
