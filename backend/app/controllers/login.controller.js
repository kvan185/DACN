const bcrypt = require("bcrypt");
const authMethod = require('./auth.method');
const jwtVariable = require('../../variables/jwt');
const { SALT_ROUNDS } = require('../../variables/auth');
const db = require("../models");
const Customer = db.customer;
const Admin = db.admin;

exports.login = async (req, res) => {
    if (!req.body.email || !req.body.password || !req.body.page) {
        return res.status(400).send({ message: "Nội dung không thể trống!" });
    }

    if (req.body.page === 'user') {
        try {
            // Tìm tài khoản
            const data = await Customer.findOne({ email: req.body.email });

            if (!data) {
                return res.status(401).send({
                    message: `Không tìm thấy khách hàng với email ${req.body.email}.`
                });
            }

            // Kiểm tra mật khẩu
            const isPasswordValid = bcrypt.compareSync(req.body.password, data.hash_password);
            if (!isPasswordValid) {
                return res.status(401).send({
                    message: `Mật khẩu không chính xác.`
                });
            }

            const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || jwtVariable.accessTokenLife;
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;
            const dataForAccessToken = {
                id: data.id,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                phone: data.phone,
                age: data.age,
                gender: data.gender,
                avatar: data.avatar,
                role: "user"
            };
            const accessToken = await authMethod.generateToken(
                dataForAccessToken,
                accessTokenSecret,
                accessTokenLife,
            );
            if (!accessToken) {
                return res.status(500).send({
                    message: `Tạo token thất bại.`
                });
            }

            const refreshTokenLife = process.env.ACCESS_TOKEN_LIFE || jwtVariable.refreshTokenLife;
            const refreshTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.refreshTokenSecret;
            const refreshToken = await authMethod.generateToken(
                dataForAccessToken,
                refreshTokenSecret,
                refreshTokenLife,
            );

            return res.json({ accessToken, refreshToken });
        } catch (error) {
            console.error(error);
            return res.status(500).send({
                message: "Đã xảy ra sự cố khi xử lý yêu cầu của bạn."
            });
        }
    } else {
        try {
            // Tìm tài khoản
            const data = await Admin.findOne({ email: req.body.email });

            if (!data) {
                return res.status(401).send({
                    message: `Không tìm thấy quản trị viên với email ${req.body.email}.`
                });
            }

            // Kiểm tra mật khẩu
            const isPasswordValid = bcrypt.compareSync(req.body.password, data.hash_password);
            if (!isPasswordValid) {
                return res.status(401).send({
                    message: `Mật khẩu không chính xác.`
                });
            }

            const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || jwtVariable.accessTokenLife;
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;
            const dataForAccessToken = {
                id: data.id,
                email: data.email,
                firstName: data.first_name,
                lastName: data.last_name,
                phone: data.phone,
                age: data.age,
                gender: data.gender,
                avatar: data.avatar,
                role: data.role
            };
            const accessToken = await authMethod.generateToken(
                dataForAccessToken,
                accessTokenSecret,
                accessTokenLife,
            );
            if (!accessToken) {
                return res.status(500).send({
                    message: `Tạo token thất bại.`
                });
            }

            const refreshTokenLife = process.env.ACCESS_TOKEN_LIFE || jwtVariable.refreshTokenLife;
            const refreshTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.refreshTokenSecret;
            const refreshToken = await authMethod.generateToken(
                dataForAccessToken,
                refreshTokenSecret,
                refreshTokenLife,
            );

            return res.json({ accessToken, refreshToken });
        } catch (error) {
            console.error(error);
            return res.status(500).send({
                message: "Đã xảy ra sự cố khi xử lý yêu cầu của bạn."
            });
        }
    }
};

exports.register = async (req, res) => {
    try {
        // Kiểm tra nếu yêu cầu body rỗng
        if (!req.body) {
            return res.status(400).send({ message: "Nội dung không thể trống!" });
        }

        // Tìm tài khoản bằng email
        const customer = await Customer.findOne({ email: req.body.email });

        if (customer) {
            return res.status(401).send({
                message: `Khách hàng đã tồn tại với email ${req.body.email}.`,
            });
        }

        // Kiểm tra xác nhận mật khẩu
        if (req.body.password !== req.body.confirm_password) {
            return res.status(400).send({
                message: "Xác nhận mật khẩu không khớp!",
            });
        }

        // Mã hóa mật khẩu
        const hashPassword = bcrypt.hashSync(req.body.password, SALT_ROUNDS);

        // Tạo khách hàng mới
        const newCustomer = new Customer({
            email: req.body.email,
            hash_password: hashPassword,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone: req.body.phone,
            gender: req.body.gender,
        });

        // Lưu khách hàng mới vào cơ sở dữ liệu
        const savedCustomer = await newCustomer.save();

        res.send(savedCustomer);
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            message: "Đã xảy ra sự cố khi xử lý yêu cầu của bạn.",
        });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        if (!req.body.page) {
            return res.status(400).send({ message: "Nội dung không thể trống!" });
        }

        // Lấy refresh token từ body
        const refreshTokenFromBody = req.body.refreshToken;
        if (!refreshTokenFromBody) {
            return res.status(400).send('Không tìm thấy refresh token.');
        }

        const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || jwtVariable.refreshTokenSecret;

        const decodedRefresh = await authMethod.decodeToken(refreshTokenFromBody, refreshTokenSecret);
        if (!decodedRefresh) {
            return res.status(400).send('Refresh token không hợp lệ.');
        }

        const email = decodedRefresh.payload.email;
        var customer;
        var admin;
        if (req.body.page === 'user') {
            customer = await Customer.findOne({ email });
            if (!customer) {
                return res.status(401).send({
                    message: `Khách hàng không tìm thấy với email ${email}.`,
                });
            }
        } else {
            admin = await Admin.findOne({ email });
            if (!admin) {
                return res.status(401).send({
                    message: `Quản trị viên không tìm thấy với email ${email}.`,
                });
            }
        }

        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;
        const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || jwtVariable.accessTokenLife;

        var dataForAccessToken;
        if (customer) {
            // Tạo token truy cập mới
            dataForAccessToken = {
                id: customer.id,
                email: customer.email,
                firstName: customer.first_name,
                lastName: customer.last_name,
                phone: customer.phone,
                age: customer.age,
                gender: customer.gender,
                avatar: customer.avatar,
            };
        } else {
            dataForAccessToken = {
                id: admin.id,
                email: admin.email,
                firstName: admin.first_name,
                lastName: admin.last_name,
                phone: admin.phone,
                age: admin.age,
                gender: admin.gender,
                avatar: admin.avatar,
                role: admin.role,
            };
        }

        const accessToken = await authMethod.generateToken(dataForAccessToken, accessTokenSecret, accessTokenLife);
        if (!accessToken) {
            return res.status(400).send('Tạo token truy cập thất bại, vui lòng thử lại.');
        }

        return res.json({
            accessToken,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            message: 'Đã xảy ra sự cố khi xử lý yêu cầu của bạn.',
        });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        // Kiểm tra nếu yêu cầu body rỗng
        if (!req.body) {
            return res.status(400).send({ message: "Nội dung không thể trống!" });
        }

        // Tìm tài khoản bằng email
        const admin = await Admin.findOne({ email: req.body.email });

        if (admin) {
            return res.status(401).send({
                message: `Quản trị viên đã tồn tại với email ${req.body.email}.`,
            });
        }

        // Kiểm tra xác nhận mật khẩu
        if (req.body.password !== req.body.confirm_password) {
            return res.status(400).send({
                message: "Xác nhận mật khẩu không khớp!",
            });
        }

        // Mã hóa mật khẩu
        const hashPassword = bcrypt.hashSync(req.body.password, SALT_ROUNDS);

        // Tạo quản trị viên mới
        const newAdmin = new Admin({
            email: req.body.email,
            hash_password: hashPassword,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone: req.body.phone,
            gender: req.body.gender,
            role: req.body.role
        });

        // Lưu quản trị viên mới vào cơ sở dữ liệu
        const savedAdmin = await newAdmin.save();

        res.send(savedAdmin);
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            message: "Đã xảy ra sự cố khi xử lý yêu cầu của bạn.",
        });
    }
};