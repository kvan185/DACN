const ingredientService = require("../services/ingredient.service");

const handleError = (res, error) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Server error",
  });
};

exports.getAll = async (req, res) => {
  try {
    const data = await ingredientService.getAll();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.create = async (req, res) => {
  try {
    const data = await ingredientService.create(req.body);
    res.status(201).json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.update = async (req, res) => {
  try {
    const data = await ingredientService.update(
      req.params.id,
      req.body
    );
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.remove = async (req, res) => {
  try {
    await ingredientService.remove(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
};