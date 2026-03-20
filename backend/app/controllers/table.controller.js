const tableService = require("../services/table.service");

exports.getTableByQRCode = async (req, res) => {
  try {
    const table = await tableService.getTableByQRCode(req.params.qrCode);
    res.json(table);
  } catch (error) {
    handleError(res, error);
  }
};

exports.addTable = async (req, res) => {
  try {
    const newTable = await tableService.addTable(req.body);
    res.status(201).json(newTable);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.tableNumber) {
      return res.status(400).json({ message: "Số bàn đã tồn tại" });
    }
    handleError(res, error);
  }
};

exports.updateTable = async (req, res) => {
  try {
    const updatedTable = await tableService.updateTable(
      req.params.id,
      req.body
    );
    res.json(updatedTable);
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteTable = async (req, res) => {
  try {
    await tableService.deleteTable(req.params.id);
    res.json({ message: "Xóa bàn thành công." });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getAllTables = async (req, res) => {
  try {
    const tables = await tableService.getAllTables();
    res.json(tables);
  } catch (error) {
    handleError(res, error);
  }
};

exports.startUsingTable = async (req, res) => {
  try {
    const table = await tableService.startUsingTable(req.params.id);
    res.json(table);
  } catch (error) {
    handleError(res, error);
  }
};

const handleError = (res, error) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ message: error.message || "Lỗi server." });
};