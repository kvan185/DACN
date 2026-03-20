const productBomService = require("../services/productBom.service");

const handleError = (res, error) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Lỗi server",
  });
};

exports.getByProduct = async (req, res) => {
  try {
    const data = await productBomService.getByProduct(
      req.params.productId
    );
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
};

exports.create = async (req, res) => {
  try {
    const bom = await productBomService.create(req.body);
    res.status(201).json(bom);
  } catch (err) {
    handleError(res, err);
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await productBomService.update(
      req.params.id,
      req.body
    );
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    await productBomService.remove(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getList = async (req, res) => {
  try {
    const data = await productBomService.getList();
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
};