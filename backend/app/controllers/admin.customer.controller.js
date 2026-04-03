// app/controllers/admin.customer.controller.js
const db = require("../models");
const Customer = db.customer;
const mongoose = require('mongoose'); // ← THÊM DÒNG NÀY
// const bcrypt = require('bcryptjs');

// 🔹 Lấy danh sách tất cả khách hàng (cho admin)
const getCustomers = async (req, res) => {
    try {
        console.log("Getting all customers...");
        const customers = await Customer.find({}).sort({ createdAt: -1 });
        console.log(`Found ${customers.length} customers`);
        res.status(200).json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách khách hàng', error: error.message });
    }
};

// 🔹 Lấy chi tiết 1 khách hàng
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra id có hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID khách hàng không hợp lệ' });
        }

        console.log("Getting customer by id:", id);
        const customer = await Customer.findById(id);

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin khách hàng' });
    }
};

// 🔹 Cập nhật khách hàng (admin)
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Updating customer ID:', id);
        console.log('Update data:', req.body);

        const { first_name, last_name, email, phone, gender, status } = req.body;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID khách hàng không hợp lệ' });
        }

        // Tạo object update
        const updateData = {};
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (gender !== undefined) updateData.gender = gender;
        if (status !== undefined) updateData.status = status;

        updateData.updatedAt = Date.now();

        const customer = await Customer.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }

        console.log('Customer updated successfully:', customer._id);

        // Trả về response không bao gồm mật khẩu
        const customerResponse = customer.toObject();
        delete customerResponse.hash_password;

        res.status(200).json({
            message: 'Cập nhật khách hàng thành công',
            customer: customerResponse
        });
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({
            message: 'Lỗi khi cập nhật khách hàng',
            error: error.message
        });
    }
};

// 🔹 Xóa khách hàng (admin)
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID khách hàng không hợp lệ' });
        }

        const customer = await Customer.findByIdAndDelete(id);

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }

        res.status(200).json({ message: 'Xóa khách hàng thành công' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ message: 'Lỗi khi xóa khách hàng' });
    }
};

// 🔹 Tạo khách hàng mới (admin)
const createCustomer = async (req, res) => {
    try {
        // Lấy dữ liệu từ req.body (vì frontend gửi JSON)
        const { email, first_name, last_name, phone, gender, password } = req.body;

        console.log("Received data:", { email, first_name, last_name, phone, gender, password });

        // Kiểm tra các trường bắt buộc
        if (!email || !first_name || !last_name || !phone || !password) {
            return res.status(400).json({
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
            });
        }

        // Kiểm tra email đã tồn tại
        const existingCustomer = await Customer.findOne({ email });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        // Kiểm tra phone đã tồn tại
        const existingPhone = await Customer.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
        }

        // Mã hóa mật khẩu (bỏ comment bcrypt)
        // const bcrypt = require('bcryptjs');
        // const hash_password = await bcrypt.hash(password, 10);

        // Tạo khách hàng mới
        const newCustomer = new Customer({
            email,
            first_name,
            last_name,
            phone,
            gender: gender || 'male',
            hash_password: password, // Nên dùng biến hash_password sau khi hash
            status: 'active'
        });

        await newCustomer.save();

        // Trả về response (ẩn mật khẩu)
        const customerResponse = newCustomer.toObject();
        delete customerResponse.hash_password;

        res.status(201).json({
            message: 'Tạo khách hàng thành công',
            customer: customerResponse
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({
            message: 'Lỗi khi tạo khách hàng',
            error: error.message
        });
    }
};

// 🔹 Khóa/Mở khóa tài khoản khách hàng
const toggleCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log('Toggle status request:', { id, status }); // Debug

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID khách hàng không hợp lệ' });
        }

        // Kiểm tra status hợp lệ
        if (!['active', 'banned', 'inactive'].includes(status)) {
            return res.status(400).json({
                message: 'Trạng thái không hợp lệ. Chấp nhận: active, banned, inactive'
            });
        }

        // Tìm và cập nhật
        const customer = await Customer.findByIdAndUpdate(
            id,
            {
                status: status,
                updatedAt: Date.now()
            },
            { new: true } // Trả về document đã cập nhật
        );

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }

        console.log('Customer status updated:', {
            id: customer._id,
            oldStatus: customer.status, // Lưu ý: status này đã được cập nhật
            newStatus: status
        });

        const action = status === 'banned' ? 'khóa' : 'mở khóa';

        res.status(200).json({
            message: `${action} tài khoản thành công`,
            customer: {
                _id: customer._id,
                email: customer.email,
                status: customer.status // Trả về status mới
            }
        });
    } catch (error) {
        console.error('Error toggling customer status:', error);
        res.status(500).json({
            message: 'Lỗi khi thay đổi trạng thái tài khoản',
            error: error.message
        });
    }
};

// Export tất cả functions
module.exports = {
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    createCustomer,
    toggleCustomerStatus
}