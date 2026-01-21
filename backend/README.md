# Hệ thống đặt đồ ăn và thức uống (Backend)

## Cài đặt
```
npm install
```

## Chạy ứng dụng
```
node server.js
```

## Các chức năng chính

### 1. Quản lý người dùng
- Đăng ký tài khoản khách hàng
- Đăng nhập (khách hàng và admin)
- Cập nhật thông tin cá nhân
- Phân quyền người dùng (ADMIN, STAFF, USER)

### 2. Quản lý danh mục
- Thêm/sửa/xóa danh mục
- Xem danh sách danh mục
- Upload hình ảnh danh mục

### 3. Quản lý sản phẩm
- Thêm/sửa/xóa sản phẩm
- Xem danh sách sản phẩm
- Tìm kiếm sản phẩm
- Upload hình ảnh sản phẩm
- Gợi ý sản phẩm cho khách hàng

### 4. Quản lý giỏ hàng
- Thêm sản phẩm vào giỏ hàng
- Cập nhật số lượng sản phẩm
- Xóa sản phẩm khỏi giỏ hàng
- Xem giỏ hàng

### 5. Quản lý đơn hàng
- Tạo đơn hàng mới
- Xem danh sách đơn hàng
- Cập nhật trạng thái đơn hàng
- Thông báo realtime khi có cập nhật đơn hàng

### 6. Thanh toán
- Thanh toán tiền mặt
- Thanh toán qua VNPay
- Kiểm tra trạng thái thanh toán

### 7. Thống kê doanh thu
- Thống kê theo ngày/tháng/năm
- Xuất báo cáo dạng CSV
- Tính tổng doanh thu

### 8. Quản lý địa chỉ
- Danh sách tỉnh/thành phố
- Danh sách quận/huyện

### 9. Tính năng bổ sung
- Xác thực JWT
- Upload hình ảnh
- Hệ thống gợi ý sản phẩm
- Thông báo realtime qua Socket.IO

## Công nghệ sử dụng
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Socket.IO
- Multer (upload file)
- VNPay Payment Gateway

### 10. Quản lý đặt bàn
- Xem danh sách bàn trống
- Đặt bàn
- Cập nhật trạng thái đặt bàn
- Quản lý sơ đồ bàn
- Gửi thông báo xác nhận qua email/SMS

// ... existing code ...

## API Documentation

Dưới đây là tài liệu API cho hệ thống đặt bàn nhà hàng sử dụng các mô hình, bộ controllers và định tuyến được cung cấp. Tài liệu này mô tả các điểm cuối API mà bạn có thể sử dụng để quản lý bàn và đặt chỗ trong nhà hàng.

### 1. API Quản lý Bàn (Table)

#### 1.1 Lấy danh sách bàn còn trống

- **URL:** `/api/tables/available`
- **Method:** `GET`
- **Query Parameters:**
  - `date`: Ngày yêu cầu (định dạng `YYYY-MM-DD`).
  - `time`: Giờ yêu cầu (định dạng `HH:mm`).
  - `guests`: Số lượng khách.
- **Response:**
  - `200 OK`: Trả về danh sách các bàn còn trống phù hợp.
  - `500 Internal Server Error`: Lỗi xảy ra khi xử lý yêu cầu.

#### 1.2 Tạo bàn mới

- **URL:** `/api/tables`
- **Method:** `POST`
- **Headers:**
  - `Authorization`: Token JWT của admin
- **Body:**
  ```json
  {
    "number": "string",
    "capacity": "number",
    "location": "string (INDOOR|OUTDOOR|WINDOW)"
  }
  ```
- **Response:**
  - `201 Created`: Thành công tạo mới bàn và trả về thông tin bàn.
  - `400 Bad Request`: Dữ liệu không hợp lệ hoặc lỗi khác.

### 2. API Quản lý Đặt chỗ (Reservation)

#### 2.1 Tạo đặt chỗ mới

- **URL:** `/api/reservations`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "tableId": "string",
    "customerName": "string",
    "customerPhone": "string",
    "reservationDate": "string (YYYY-MM-DDTHH:mm:ssZ)",
    "numberOfGuests": "number",
    "note": "string"
  }
  ```
- **Response:**
  - `201 Created`: Thành công tạo mới đặt chỗ và trả về thông tin đặt chỗ.
  - `400 Bad Request`: Nếu bàn không khả dụng hoặc lỗi khác.

#### 2.2 Cập nhật trạng thái đặt chỗ

- **URL:** `/api/reservations/:id/status`
- **Method:** `PUT`
- **Headers:**
  - `Authorization`: Token JWT của người dùng
- **Body:**
  ```json
  {
    "status": "string (PENDING|CONFIRMED|CANCELLED|COMPLETED)"
  }
  ```
- **Response:**
  - `200 OK`: Thành công cập nhật trạng thái và trả về thông tin đặt chỗ đã cập nhật.
  - `404 Not Found`: Không tìm thấy đặt chỗ với id được cung cấp.
  - `400 Bad Request`: Dữ liệu không hợp lệ hoặc lỗi khác.

### 3. Helper Function

- **generateConfirmationCode:** Hàm tạo mã xác nhận cho một đơn đặt chỗ với độ dài 6 ký tự bao gồm chữ cái và chữ số.
