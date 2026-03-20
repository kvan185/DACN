const Ingredient = require("../models/ingredient.model");
const { checkManyProducts } = require("../services/product.service");
const ProductBOM = require("../models/productBom.model");

exports.getAll = async (req, res) => {
  try {
    const data = await Ingredient.find({ is_active: true });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Ingredient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    const boms = await ProductBOM.find({
      ingredient_id: updated._id
    });

    const productIds = boms.map(b => b.product_id);
    await checkManyProducts(productIds);
    res.json(updated);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Ingredient.findByIdAndUpdate(req.params.id, {
      is_active: false,
    });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};