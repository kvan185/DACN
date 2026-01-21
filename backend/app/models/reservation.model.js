module.exports = mongoose => {
  var ReservationSchema = mongoose.Schema(
    {
      customerName: {
        type: String,
        required: true
      },
      confirmationCode: {
        type: String,
        required: true,
        unique: true
      },
      phoneNumber: {
          type: String,
          required: true
      },
      tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'table', // Reference to the Table model
        required: true
      },
      specialRequests: {
          type: String
      },
      createdAt: {
          type: Date,
          default: Date.now
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
          validator: function(v) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
          },
          message: "Email không hợp lệ"
        }
      }
    }
  );
  ReservationSchema.pre("save", async function(next) {
    try {
      const Table = mongoose.model('table');
      const table = await Table.findById(this.tableId);
      
      if (!table) {
          throw new Error('Bàn không tồn tại');
      }
      
      if (!table.isAvailable) {
          throw new Error('Bàn đã được đặt');
      }
      
      next();
  } catch (error) {
      next(error);
    }
  });
  ReservationSchema.post("save", async function(doc, next) {
    const Table = mongoose.model('table');
    await Table.findByIdAndUpdate(doc.tableId, { isAvailable: false, status: 'Đã đặt' });
    next();
  });

  ReservationSchema.statics.completeReservation = async function(tableId) {
    try {
        const Table = mongoose.model('table');
        const reservation = await this.findOne({ tableId: tableId });
        
        if (!reservation) {
            throw new Error('Không tìm thấy thông tin đặt bàn');
        }

        // Cập nhật trạng thái bàn thành available
        await Table.findByIdAndUpdate(reservation.table, { 
            isAvailable: true ,
            status: 'Trống'
        });
        // Xóa thông tin đặt bàn
        await this.deleteOne({ tableId: tableId });

        return { message: 'Đã hoàn tất và giải phóng bàn thành công' };
    } catch (error) {
        throw error;
    }
  };
  
  ReservationSchema.statics.generateConfirmationCode = function() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const Reservation = mongoose.model('reservation', ReservationSchema);
  return Reservation;
}