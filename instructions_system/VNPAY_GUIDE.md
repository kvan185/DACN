## Cấu hình backend/.env
VNP_TMNCODE=HJR2ZNQM
VNP_HASHSECRET=6OHV0HT9II0YWATXIIX5APQ8N1W7H5V5
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURNURL=http://localhost:5173/checkout

## Thông tin thẻ Test (Sandbox)
Ngân hàng	    NCB
Số thẻ	        9704198526191432198
Tên chủ thẻ	    NGUYEN VAN A
Ngày phát hành	07/15
Mật khẩu OTP	123456


## Quy trình kiểm tra (The Flow)

1. **Chọn món**: Thêm món vào giỏ hàng và đi tới trang **Thanh toán**.
2. **Chọn Chuyển khoản**: Chọn phương thức "Chuyển khoản ngân hàng" và nhấn **Đặt hàng**.
3. **Chuyển hướng**: Hệ thống sẽ đưa bạn sang trang của VNPAY.
4. **Nhập thẻ**: Chọn ngân hàng **NCB**, nhập số thẻ và thông tin ở bảng trên.
5. **Xác nhận OTP**: Nhập `123456`.
6. **Hoàn tất**: VNPAY sẽ thông báo thành công và chuyển bạn quay lại trang web.
