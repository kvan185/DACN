# Kịch Bản Demo Dự Án: Hệ Thống Quản Lý Nhà Hàng Toàn Diện

> **Mục tiêu Demo**: Thể hiện được sự mượt mà, tính tự động hóa cao và trải nghiệm người dùng (UX) xuất sắc của hệ thống thông qua các luồng tương tác thực tế từ Khách hàng đến Nhân viên.

---

## 🎭 Phân Vai Chuẩn Bị
Để demo trực quan, cần mở 2 trình duyệt hoặc chia màn hình:
1. **Màn hình Khách hàng (Mobile-view)**: Trình duyệt đóng vai trò khách đang xem trên điện thoại.
2. **Màn hình Nhân viên/Thu ngân (Desktop-view)**: Trình duyệt đóng vai trò nhân viên quản lý.
3. **Màn hình Nhà bếp (Cũng có thể gỡ chung tab với quản lý để mở qua lại)**

---

## 🎬 Luồng 1: Tiếp đón khách và Gọi món (Khách hàng & Phục vụ)

**1. Khách vào quán & Bố trí bàn (Màn Nhân Viên)**
- **Nhân viên**: Mở thẻ "Quản lý Bàn".
- **Thuyết minh**: *"Giao diện Quản lý bàn của chúng tôi hoạt động theo thời gian thực. Khi khách đến, nhân viên sẽ bấm 'Sử dụng' bàn số 3 chẳng hạn. Bàn chuyển trạng thái 'Đang sử dụng' màu đỏ ngay lập tức."*

**2. Khách quét mã QR gọi món (Màn Khách Hàng)**
- **Khách hàng**: Truy cập đường link (URL) gắn với `table=3` (Mô phỏng quét QR). Thêm 3 ly thức uống và 1 món chính vào giỏ.
- **Thuyết minh**: *"Khi quét mã, hệ thống tự động ghi nhận số bàn. Trong giỏ hàng tiếp cận thanh toán, thông tin hình thức đặt hàng tự nhận diện là 'Đặt tại bàn - Bàn 3'."*
- **Khách hàng**: Chọn phương thức thanh toán phù hợp trong combobox ở mục Thanh Toán.
- Khách bấm **Xác nhận Order**.

---

## 🎬 Luồng 2: Điều phối Nhà Bếp & Giao Đồ Ăn (Nhà Bếp)

- **Nhà Bếp**: Chuyển sang màn hình hệ thống của Bếp (Hoặc Quản lý đơn).
- **Thuyết minh**: *"Ngay lập tức, món ăn đổ về hệ thống đơn hàng bếp mà không cần nhân viên ghi giấy chạy xuống. Bếp xác nhận 'Đang làm'*... và sau đó ấn *'Hoàn thành'*."*
- Trạng thái đơn được tự động phản hồi lại ở tab quản lý của thu ngân giúp bám sát tiến độ phục vụ.

---

## 🎬 Luồng 3: Tách Bill & Tính Tiền Thông Minh (Tính Năng Sáng Giá)

**Tình huống**: Nhóm khách gọi chung nhưng giờ muốn chia tiền công bằng (Tách Bill). Tính năng này có thể tự khách làm trên điện thoại, hoặc nhân viên thu ngân cung cấp nghiệp vụ.

### Option A: Khách tự tách bill trên Mobile
- **Khách hàng**: Tại giao diện người dùng, khách kéo xuống và ấn **"Mở chia hóa đơn"**.
- Trình diễn việc chia theo tỷ lệ 50-50%, điền tên hai người "A" và "B". Nhấn Xác nhận.
- **Thuyết minh**: *"Chỉ với vài thao tác, hệ thống xử lý tách bill ngay. Không bị popup thông báo che khuất làm loãng nội dung, màn hình tự động chuyển sang trực quan 'Danh Sách Thanh Toán Sau Khi Tách' rõ đẹp, báo hiệu thành công và đính kèm lời nhắc màu đỏ: Quý khách hãy đến quầy mang theo số bàn để đối soát."*

### Option B: Thu Ngân thao tác và Quét QR Siêu Tốc
- **Nhân viên**: Mở quản lý "Đơn Hàng", vào Chi tiết hóa đơn Bàn 3 (Hoặc đi từ tab Quản lý Bàn qua nút Thanh Toán xanh).
- **Thuyết minh**: *"Giả sử khách nhờ thu ngân tách giùm. Thu ngân chỉ cần bấm ngay nút '✏️ Chỉnh sửa' tiện lợi sát bảng thông tin chia bill để tách hộ hoặc tái cấu trúc chia tiền nếu khách đổi ý."*
- Khi đã tách xong, nhân viên chọn phương thức "Chuyển khoảnQR" cho khách tương ứng.
- **Thuyết minh**: *"Ngay lập tức mã QR thanh toán của PayOS được sinh ra trực tiếp bằng file vector SVG hệ thống. Điểm đột phá tại đây là thời gian khởi tạo QR chưa tới 1 giây, hoàn toàn không dính tình trạng lag / đơ gián đoạn như những bên sử dụng API thứ ba, và chuẩn nét kể cả khi mang đi In Hóa Đơn."*
- Thu Ngân ấn **"Xác nhận đã nhận tiền"**: Nút thanh toán bay màu thành nhãn dòng trạng thái "✅ Đã trực tiếp thanh toán".

---

## 🎬 Luồng 4: Dọn Bàn Thông Minh & Hoàn Khép Vòng Đời Trải Nghiệm (Nhân Viên)

**Tình huống**: Cả nhóm khách đã thanh toán xong hết mọi thứ và rời đi.
- **Nhân viên**: Quay lại trang "Quản lý Bàn" tổng.
- **Thuyết minh**: *"Một điểm thiết kế tinh tế để hỗ trợ sự phối hợp giữa Thu Ngân và Phục Vụ: Khi hệ thống quét ra đơn hàng tại Bàn này đã được cập nhật Đã thanh toán, nó lập tức kích hoạt quy trình Dọn dẹp ngầm."*
- **Thuyết minh**: *"Nút 'Thanh toán' tự hiểu và biến mất (cách âm lỗi bấm lặp thu tiền 2 lần). Cột ghi chú chớp sáng với dòng trạng thái siêu trực quan: **'✅ Đã thanh toán, chuẩn bị dọn bàn để đón khách kế tiếp'**."*
- **Nhân viên dọn bàn**: Quan sát màn hình, tiến đến dọn dẹp không cần chờ thu ngân "hô". Dọn xong ấn nút **"Hoàn thành"** ở bàn đó. Bàn chuyển từ màu nhộn nhịp sang "Trống", và mọi cảnh báo gỡ sạch sẽ.

---

## 🌟 Tổng kết Điểm Nhấn (Nên nhấn mạnh khi Demo)

1. **Giao Diện UI/UX Phẳng & Mượt (Clean Architecture)**: Bảng thông tin cực kì gọn, các thẻ Header khách hàng và OrderDetail được tối ưu hóa hiển thị nằm chung hàng tiết kiệm scroll. 
2. **Sự Kết Nối Liền Mạch (Seamless Flow)**: Bàn - Bếp - Khách Hàng - Thu Ngân không bao giờ cần trao đổi lời nói mà làm việc trơn tru vượt bực nhờ hệ sinh thái Socket.
3. **Thao tác nhanh gọn**: Giải quyết hoàn triệt để quy trình thanh toán Tách Bill là một nỗi đau nhức nhối của các quán FnB với giao diện thiết kế quá chi tiết và rành mạch.
