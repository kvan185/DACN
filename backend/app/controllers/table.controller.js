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
  const expiryLimit = new Date(now.getTime() - 30 * 60 * 1000); // Giữ bàn trong 30 phút

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

  const fortyFiveMinutesFromNow = new Date(now.getTime() + 45 * 60 * 1000);

  return tables.map(table => {
    // Trong hàm aggregate, document trả về đã là plain JS object
    const t = { ...table };
    t.note = ""; // Khởi tạo ghi chú trống
    t.nextReservationTime = null;

    // Tìm reservation của bàn này trong hôm nay (không bao gồm 'Đã hủy', 'Hoàn thành')
    const res = todayReservations.find(r => r.tableId.toString() === t._id.toString());

    if (res) {
      t.activeReservationId = res._id;
      t.confirmationCode = res.confirmationCode;
      t.customerName = res.customerName;
      t.reservationNote = res.specialRequests;
      const resTime = new Date(res.reservationTime);
      const diffMs = resTime - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      if (res.status === 'Đang sử dụng') {
        t.note = `"${t.customerName}" bắt đầu sử dụng bàn`;
        t.status = 'Đang sử dụng';
        t.isAvailable = false;
      } else {
        if (resTime <= fortyFiveMinutesFromNow) {
          t.nextReservationTime = res.reservationTime;
          t.holdExpiryTime = new Date(resTime.getTime() + 30 * 60 * 1000);

          if (t.status === 'Đang sử dụng') {
            t.note = "Sắp đến giờ đặt bàn của khách, mau chóng xử lý!";
          } else {
            t.status = 'Đã đặt';
            t.isAvailable = false;
            t.note = "Bàn đang giữ chỗ";
          }
        } else {
          // Ngoài khoảng 45 phút, nếu không đang sử dụng thì là Trống
          if (t.status !== 'Đang sử dụng') {
            t.status = 'Trống';
            t.isAvailable = true;
          }
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

exports.getAvailableTables = async (req, res) => {
  try {
    const tables = await exports.getTablesListInternal();
    const availableTables = tables.filter(t => 
        t.isAvailable === true && 
        t.status !== 'Đang sử dụng' && 
        !t.merged_into
    );
    res.json(availableTables);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách bàn trống.' });
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
    const fortyFiveMinutesFromNow = new Date(now.getTime() + 45 * 60 * 1000);

    const reservation = await db.reservation.findOne({
      tableId: id,
      use_date: todayDateQuery,
      status: 'Đã đặt',
      reservationTime: { $lte: fortyFiveMinutesFromNow }
    });

    if (reservation) {
      const now = new Date();
      const expiryTime = new Date(reservation.reservationTime.getTime() + 30 * 60 * 1000);

      if (now > expiryTime) {
        reservation.status = 'Đã hủy';
        await reservation.save();
        return res.status(400).json({ message: 'Đã quá thời gian nhận bàn (quá 30 phút).' });
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

exports.mergeTable = async (req, res) => {
  try {
    const { fromTable, toTable } = req.body;

    if (!fromTable || !toTable) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp bàn cần gộp và bàn đích.' });
    }

    if (String(fromTable) === String(toTable)) {
      return res.status(400).json({ success: false, message: 'Không thể gộp vào cùng một bàn.' });
    }

    const tFrom = await Table.findOne({ tableNumber: fromTable });
    const tTo = await Table.findOne({ tableNumber: toTable });

    if (!tFrom || !tTo) {
      return res.status(404).json({ success: false, message: 'Bàn không tồn tại.' });
    }

    // Bàn nguồn chưa bị merge
    if (tFrom.merged_into) {
      return res.status(400).json({ success: false, message: 'Bàn này đã được gộp vào bàn khác, không được gộp tiếp.' });
    }
    
    // Đảm bảo bàn đích không phải là một Bàn bị gộp (SLAVE)
    if (tTo.merged_into) {
      return res.status(400).json({ success: false, message: 'Bàn đích đang là bàn bị gộp, vui lòng chọn Bàn Chủ hoặc bàn trống.' });
    }

    // Bàn fromTable bị gộp: status đang sử dụng, isAvailable false, merged_into toTable
    tFrom.merged_into = String(toTable);
    tFrom.isAvailable = false;
    tFrom.status = 'Đang sử dụng';
    await tFrom.save();

    // Bàn toTable được gộp: status đang sử dụng, isAvailable là false
    tTo.status = 'Đang sử dụng';
    tTo.isAvailable = false;
    await tTo.save();

    // Bắn realtime cho bàn 5, bàn 6 (nếu app frontend có subscribe các room này)
    const listSocket = require('../socket');
    if (listSocket && listSocket.updateOrder) {
        listSocket.updateOrder.to(String(fromTable)).emit('tableMerged', { merged_into: toTable });
        listSocket.updateOrder.to(String(toTable)).emit('tableMerged', { received_from: fromTable });
    }

    res.status(200).json({ success: true, message: 'Merge table success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi server khi gộp bàn.' });
  }
};

exports.unmergeTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber) return res.status(400).json({ success: false, message: 'Thiếu mã bàn.' });
    
    const Table = db.table;
    const slaveTable = await Table.findOne({ tableNumber: Number(tableNumber) });
    
    if (!slaveTable) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn.' });
    if (!slaveTable.merged_into) return res.status(400).json({ success: false, message: 'Bàn này đang không bị gộp.' });
    
    const masterTableNumber = slaveTable.merged_into;

    // 1. Cập nhật Bàn bị gộp (SLAVE)
    slaveTable.merged_into = null;
    slaveTable.status = 'Trống';
    slaveTable.isAvailable = true;
    await slaveTable.save();
    
    // 2. Cập nhật Bàn chủ (MASTER)
    const masterTable = await Table.findOne({ tableNumber: Number(masterTableNumber) });
    if (masterTable) {
        // Kiểm tra xem Master có còn bàn Slave nào khác gộp vào không
        const remainingSlaves = await Table.countDocuments({ merged_into: String(masterTableNumber) });
        if (remainingSlaves === 0) {
            masterTable.status = 'Trống';
            masterTable.isAvailable = true;
            await masterTable.save();
        }
    }
    
    const listSocket = require('../socket');
    if (listSocket && listSocket.updateOrder) {
      listSocket.updateOrder.emit('tableMerged', { unmerged: tableNumber, master: masterTableNumber });
    }
    
    res.status(200).json({ success: true, message: 'Tách bàn thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tách bàn' });
  }
};