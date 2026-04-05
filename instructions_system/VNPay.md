
## Các bước cấu hình Public Localhost để đăng ký VNPAY Sandbox
### Bước 1: Cài đặt công cụ ngrok
* Tải và cài đặt **ngrok** từ Microsoft Store (hoặc trang chủ ngrok.com).
* Công cụ này giúp biến địa chỉ nội bộ (`localhost`) thành một đường dẫn công khai trên internet (`public URL`) để hệ thống VNPAY có thể nhận diện và gửi dữ liệu về.
### Bước 2: Thiết lập tài khoản (Authtoken)
* Truy cập vào trang quản trị của ngrok tại [dashboard.ngrok.com] (https://dashboard.ngrok.com).
* Vào mục **Your Authtoken** và copy mã token cá nhân.
* Mở Terminal (cửa sổ dòng lệnh) và gõ lệnh sau để kích hoạt:
    ```bash
    ngrok config add-authtoken <mã_token_của_bạn>
    ```

### Bước 3: Tạo đường dẫn Public cho dự án Vite
* Đảm bảo project của bạn đang chạy ở cổng 5173 (lệnh `npm run dev`).
* Trong Terminal, gõ lệnh để "thông" cổng:
    ```bash
    ngrok http 5173
    ```
* **Kết quả:** Bạn sẽ nhận được một đường dẫn tại dòng **Forwarding** có dạng:
    `https://ideational-deetta-overpensively.ngrok-free.dev`

### Bước 4: Đăng ký tài khoản Merchant Test tại VNPAY
* Truy cập trang [sandbox.vnpayment.vn/devreg/](https://sandbox.vnpayment.vn/devreg/).
* **Địa chỉ URL:** Dán cái link `.ngrok-free.dev` vừa tạo ở bước 3 vào đây (VNPAY sẽ không báo lỗi "Không đúng định dạng Url" nữa).
* Điền đầy đủ thông tin: Tên website, Email, Mật khẩu và mã CAPTCHA.
* Nhấn **Đăng ký**.

### Bước 5: Kiểm tra Email và lưu thông tin tích hợp
* Kiểm tra hòm thư (kể cả mục Spam) để nhận Email từ VNPAY.
* **Lưu lại 2 thông tin quan trọng nhất:**
    1.  **vnp_TmnCode**: Mã định danh website (Terminal ID).
    2.  **vnp_HashSecret**: Chuỗi bí mật dùng để tạo chữ ký bảo mật (Checksum).

---

**Lưu ý quan trọng:** * **Không tắt** cửa sổ ngrok trong quá trình bạn đang code và test thanh toán. 
