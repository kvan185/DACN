const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { SALT_ROUNDS } = require("../../variables/auth");
const db = require("../models");
const Admin = db.admin;

// CHANGED: Use static/images/avatars/
const AVATAR_DIR = path.join(__dirname, "../../static/images/avatars");

// Ensure the directory exists
if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `${timestamp}-${file.originalname.replace(/\s+/g, "_")}`);
    },
});

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận các định dạng ảnh: .jpg, .jpeg, .png"));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Giới hạn 2MB
    fileFilter: fileFilter
});

// GET: Lấy danh sách nhân viên 
exports.getAllStaffs = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10, role, gender } = req.query;
        
        const query = {};

        // Role filtering
        if (role && role !== 'All') {
            query.role = role === 'ADMIN' || role === 'STAFF' ? role : { $in: ['ADMIN', 'STAFF'] };
        } else {
            query.role = { $in: ['ADMIN', 'STAFF'] };
        }

        // Tìm kiếm theo tên, email hoặc số điện thoại
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            query.$or = [
                { first_name: searchRegex },
                { last_name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ["$first_name", " ", "$last_name"] },
                            regex: search,
                            options: "i"
                        }
                    }
                },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ["$last_name", " ", "$first_name"] },
                            regex: search,
                            options: "i"
                        }
                    }
                }
            ];
        }

        // ADDED: Gender filtering
        if (gender && gender !== 'All') {
            query.gender = gender;
        }

        const limitNum = parseInt(limit, 10);
        const pageNum = parseInt(page, 10);
        const skip = (pageNum - 1) * limitNum;

        const totalItems = await Admin.countDocuments(query);
        const staffs = await Admin.find(query).skip(skip).limit(limitNum).sort({ role: 1, createdAt: -1 });

        res.json({
            staffs,
            currentPage: pageNum,
            totalPages: Math.ceil(totalItems / limitNum),
            totalItems
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Lỗi server" });
    }
};

// POST: Tạo mới
exports.createStaff = [
    upload.single("avatar"),
    async (req, res) => {
        try {
            const data = req.body;
            
            const exist = await Admin.findOne({ email: data.email });
            if (exist) {
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(401).json({ message: `Tài khoản đã tồn tại với email ${data.email}.` });
            }

            if (data.password !== data.confirm_password) {
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: "Xác nhận mật khẩu không khớp!" });
            }

            const hashPassword = bcrypt.hashSync(data.password, SALT_ROUNDS);

            const newStaff = new Admin({
                email: data.email,
                hash_password: hashPassword,
                first_name: data.first_name || "",
                last_name: data.last_name || "",
                phone: data.phone || "",
                age: data.age || null,
                gender: data.gender || "",
                role: data.role || 'STAFF', // Added support for manual role input
                // CHANGED: Use static/images/avatars/
                avatar: req.file ? `/static/images/avatars/${req.file.filename}` : null
            });

            await newStaff.save();
            res.status(201).json({ message: "Tạo tài khoản thành công!", staff: newStaff });
        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ message: error.message || "Lỗi server" });
        }
    }
];

// PUT: Cập nhật
exports.updateStaff = [
    upload.single("avatar"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const staff = await Admin.findById(id);

            if (!staff) {
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(404).json({ message: "Không tìm thấy tài khoản" });
            }

            const data = req.body;

            if (data.password && data.password.trim() !== '') {
                if (data.password !== data.confirm_password) {
                    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    return res.status(400).json({ message: "Xác nhận mật khẩu không khớp!" });
                }
                staff.hash_password = bcrypt.hashSync(data.password, SALT_ROUNDS);
            }

            staff.first_name = data.first_name || staff.first_name;
            staff.last_name = data.last_name || staff.last_name;
            staff.phone = data.phone || staff.phone;
            staff.age = data.age || staff.age;
            staff.gender = data.gender || staff.gender;
            
            // Allow role change if requested
            if (data.role && ['ADMIN', 'STAFF'].includes(data.role)) {
                staff.role = data.role;
            }

            if (req.file) {
                if (staff.avatar) {
                    const oldAvatarName = path.basename(staff.avatar);
                    const oldAvatarFullPath = path.join(AVATAR_DIR, oldAvatarName);
                    if (fs.existsSync(oldAvatarFullPath)) {
                        fs.unlinkSync(oldAvatarFullPath);
                    }
                }
                // CHANGED: Use static/images/avatars/
                staff.avatar = `/static/images/avatars/${req.file.filename}`;
            }

            const updated = await staff.save();
            res.json({ message: "Cập nhật thành công!", staff: updated });
        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ message: error.message });
        }
    }
];

// DELETE: Xóa
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await Admin.findById(id);

        if (!staff) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản" });
        }

        if (staff.avatar) {
            const avatarName = path.basename(staff.avatar);
            const avatarFullPath = path.join(AVATAR_DIR, avatarName);
            if (fs.existsSync(avatarFullPath)) {
                fs.unlinkSync(avatarFullPath);
            }
        }

        await staff.remove(); 
        res.json({ message: "Đã xóa tài khoản thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSupportContact = async (req, res) => {
    try {
        const support = await Admin.findOne({ role: 'ADMIN' }).select('_id first_name last_name avatar');
        if (!support) return res.status(404).send({ message: "No support available" });
        res.json(support);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
