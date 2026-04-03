const multer = require("multer");
const path = require("path");
const adminService = require("../services/admin.service");
const middlewares = require("./auth.middlewares");
const fs = require("fs");
const db = require("../models");
const Admin = db.admin;

const AVATAR_DIR = path.join(__dirname, "../../static/images/avatars");

// Ensure the directory exists just in case
if (!fs.existsSync(AVATAR_DIR)){
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
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: fileFilter
});

const handleError = (res, error) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.message || "Server error",
    });
};

exports.updateProfile = (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
        try {
            if (err) throw { status: 400, message: err.message };

            // Verify authentication
            const auth = await middlewares.checkAuth(req);
            if (!auth || !auth.id) {
                throw { status: 401, message: "Authentication failed. Token invalid or expired." };
            }

            // Using auth.id exactly as it comes from the JWT payload
            const result = await adminService.updateProfile(auth.id, req.body, req.file);

            // Respond back with the exact payload structure updated so frontend updates local session state
            res.json(result);
        } catch (error) {
            handleError(res, error);
        }
    });
};

exports.updateAvatar = (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
        try {
            if (err) throw { status: 400, message: "Upload error: " + err.message };

            if (!req.file) {
                throw { status: 400, message: "No file uploaded. Please upload an avatar image." };
            }

            // Verify authentication
            const auth = await middlewares.checkAuth(req);
            if (!auth || !auth.id) {
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                throw { status: 401, message: "Authentication failed. Token invalid or expired." };
            }

            // Find Admin
            const admin = await Admin.findById(auth.id);
            if (!admin) {
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                throw { status: 404, message: "Admin not found." };
            }

            // Prepare relative URL for new avatar
            const newAvatarPath = `/static/images/avatars/${req.file.filename}`;

            // Delete old avatar if it exists
            if (admin.avatar) {
                const oldAvatarName = path.basename(admin.avatar);
                const oldAvatarFullPath = path.join(AVATAR_DIR, oldAvatarName);
                if (fs.existsSync(oldAvatarFullPath)) {
                    fs.unlinkSync(oldAvatarFullPath);
                }
            }

            // Update user document
            admin.avatar = newAvatarPath;
            await admin.save();

            res.json({
                message: "Cập nhật ảnh đại diện thành công",
                avatar: newAvatarPath
            });
        } catch (error) {
            handleError(res, error);
        }
    });
};
