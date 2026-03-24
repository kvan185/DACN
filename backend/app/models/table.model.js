module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        tableNumber: {
            type: Number,
            required: true,
            unique: true,
        },
        
        qrCode: { type: String, unique: true }, // Lưu trữ URL hoặc dữ liệu của mã QR
        isAvailable: { type: Boolean, default: true },
        status: { type: String, enum: ['Trống', 'Đã đặt', 'Đang sử dụng'], default: 'Trống' },
        seatingCapacity: { 
            type: Number, 
            required: true,
            min: 1 
        },
        location: { 
            type: String,
            enum: ['Tầng 1 trong nhà', 'Tầng 2 trong nhà', 'Tầng 1 ngoài trời', 'Tầng 2 ngoài trời'],
            required: true 
        }
      }
    );
  
    const Table = mongoose.model('table', schema);
  
    return Table;
  };