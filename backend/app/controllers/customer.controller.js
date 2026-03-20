const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const middlewares = require("./auth.middlewares");
const customerService = require("../services/customer.service");

const DIR = "static/images/";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DIR);
    },
    filename: (req, file, cb) => {
        const fileName =
            uuidv4() +
            "-" +
            file.originalname.toLowerCase().split(" ").join("-");
        cb(null, fileName);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/png", "image/jpg", "image/jpeg"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
        }
    },
});

const handleError = (res, error) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.message || "Server error",
    });
};

exports.updateCustomer = (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
        try {
            if (err) throw { status: 400, message: err.message };

            const auth = await middlewares.checkAuth(req);
            if (!auth) {
                throw { status: 401, message: "Authentication failed" };
            }

            const result = await customerService.updateCustomer(
                auth.id,
                req.body,
                req.file
            );

            res.json(result);
        } catch (error) {
            handleError(res, error);
        }
    });
};