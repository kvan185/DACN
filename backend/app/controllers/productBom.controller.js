const ProductBOM = require("../models/productBom.model");
const mongoose = require("mongoose");

exports.getByProduct = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);

    const data = await ProductBOM.find({
      product_id: productId,
    }).populate({
      path: "ingredient_id",
      select: "name unit qty"
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Thêm định lượng nguyên liệu cho món
exports.create = async (req, res) => {
  try {
    const bom = await ProductBOM.create(req.body);
    res.status(201).json(bom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Cập nhật định lượng
exports.update = async (req, res) => {
  try {
    const updated = await ProductBOM.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Xóa 1 nguyên liệu khỏi món
exports.remove = async (req, res) => {
  try {
    await ProductBOM.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getList = async (req, res) => {
  try {
    const data = await ProductBOM.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
