const Ingredient = require("../models/ingredient.model");
const ProductBOM = require("../models/productBom.model");
const { checkAllProductsAvailability } = require("./product.service");

const getAll = async (searchQuery) => {
    let query = {};
    if (searchQuery) {
        query.name = { $regex: searchQuery, $options: 'i' };
    }
    return await Ingredient.find(query).sort({ createdAt: -1 });
};

const create = async (data) => {
    const result = await Ingredient.create(data);
    await checkAllProductsAvailability();
    return result;
};

const update = async (id, data) => {
    const updated = await Ingredient.findByIdAndUpdate(id, data, {
        new: true,
    });

    if (!updated) {
        throw { status: 404, message: "Ingredient not found" };
    }

    // Luôn quét lại toàn bộ sản phẩm để đồng bộ trạng thái 'Đã hết'
    await checkAllProductsAvailability();

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