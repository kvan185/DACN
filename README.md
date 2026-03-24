# Hệ Thống Quản Lý Đơn Đặt Hàng Thực Phẩm

## Description
Ứng dụng web để quản lý đơn đặt hàng thực phẩm trong nhà hàng.
Bao gồm vai trò quản trị viên và nhân viên.

## Công nghệ sử dụng
- Backend: Node.js, Express
- Frontend: React, Vite
- Database: MongoDB

## Database Setup
1. Create database: food_order
2. Import data:
```
food_order.products.json
food_order.categories.json
food_order.tables.json
```


## Run Backend
```
cd backend
npm install
npm start
```

## Run Frontend
```
cd frontend
npm install
npm run dev
```

## Demo Accounts (for testing)
Admin:
- Email: admin@admin.ad
- Password: 123456

Staff:
- Email: staff@staff.st
- Password: 123456

- #395425
- #4c7031
- #538b24
- #67ab2d
- #6da63e
- #abd02c
- #e0eeaf

- #9a7414
- #DAA520
- #ddcc9e


## Quản lý đặt bàn
- Đồng bộ thời gian thực trạng thái bàn và đơn đặt giữa Admin và Khách hàng.
- Tự động giải phóng bàn và hủy đơn nếu quá 3 tiếng khách không đến.
- Cửa sổ kích hoạt 1 tiếng: Bàn chỉ chuyển sang "Đã đặt" trước giờ hẹn 1 tiếng, giúp tối ưu công suất phục vụ khách vãng lai.
- Ghi chú thông minh: Cảnh báo nhân viên khi sắp có khách đến hoặc xác nhận bàn đang được giữ chỗ.
- Phân tách khách vãng lai và khách đặt: Đảm bảo việc sử dụng bàn hiện tại không ảnh hưởng đến các lịch đặt xa hơn trong ngày.
- Trang chi tiết đầy đủ: Xem được toàn bộ lịch trình đặt bàn trong ngày ngay tại modal chi tiết.