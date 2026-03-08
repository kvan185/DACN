const express = require("express");
const router = express.Router();
const controller = require("../controllers/productBom.controller");

// Lấy BOM theo product
router.get("/product/:productId", controller.getByProduct);

// Thêm nguyên liệu vào món
router.post("/", controller.create);

// Cập nhật định lượng
router.put("/:id", controller.update);

// Xóa khỏi món
router.delete("/:id", controller.remove);

module.exports = router;