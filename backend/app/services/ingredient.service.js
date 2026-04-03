const Ingredient = require("../models/ingredient.model");
const ProductBOM = require("../models/productBom.model");
const { checkManyProducts } = require("./product.service");

const getAll = async (searchQuery) => {
    let query = {};
    if (searchQuery) {
        query.name = { $regex: searchQuery, $options: 'i' };
    }
    return await Ingredient.find(query).sort({ createdAt: -1 });
};

const create = async (data) => {
    return await Ingredient.create(data);
};

const update = async (id, data) => {
    const updated = await Ingredient.findByIdAndUpdate(id, data, {
        new: true,
    });

    if (!updated) {
        throw { status: 404, message: "Ingredient not found" };
    }

    const boms = await ProductBOM.find({
        ingredient_id: updated._id,
    });

    const productIds = boms.map((b) => b.product_id);

    await checkManyProducts(productIds);

    return updated;
};

const remove = async (id) => {
    const updated = await Ingredient.findByIdAndUpdate(id, {
        is_active: false,
    });

    if (!updated) {
        throw { status: 404, message: "Ingredient not found" };
    }

    return true;
};

module.exports = {
    getAll,
    create,
    update,
    remove,
};