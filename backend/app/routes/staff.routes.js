module.exports = app => {
    const staffController = require("../controllers/staff.controller.js");
    const middlewares = require("../controllers/auth.middlewares.js");
    const db = require("../models");
    const Admin = db.admin;

    const router = require("express").Router();

    // Custom Middleware kiểm tra quyền ADMIN
    const verifyAdminRole = async (req, res, next) => {
        try {
            const auth = await middlewares.checkAuth(req);
            if (!auth || !auth.id) {
                return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
            }

            const activeAdmin = await Admin.findById(auth.id);
            if (!activeAdmin || activeAdmin.role !== 'ADMIN') {
                return res.status(403).json({ message: "Truy cập bị từ chối! Bạn cần quyền ADMIN." });
            }

            req.user = activeAdmin;
            next();
        } catch (error) {
            return res.status(500).json({ message: "Lỗi xác thực quyền" });
        }
    };

    router.get("/", verifyAdminRole, staffController.getAllStaffs);
    router.post("/", verifyAdminRole, staffController.createStaff);
    router.put("/:id", verifyAdminRole, staffController.updateStaff);
    router.delete("/:id", verifyAdminRole, staffController.deleteStaff);

    app.use("/api/staff", router);
};
