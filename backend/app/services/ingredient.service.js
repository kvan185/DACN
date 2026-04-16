const Ingredient = require("../models/ingredient.model");
const ProductBOM = require("../models/productBom.model");
const { checkAllProductsAvailability } = require("./product.service");

const getAll = async (filters) => {
    let query = {};
    const { search, maxQty, status, sortBy, order } = typeof filters === 'string' ? { search: filters } : (filters || {});

    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        query.$or = [
            { name: searchRegex },
            { unit: searchRegex },
            { note: searchRegex }
        ];
        // Support search by exact quantity if input is numeric
        if (!isNaN(search) && search.trim() !== '') {
            query.$or.push({ qty: Number(search) });
        }
    }

    if (maxQty !== undefined && maxQty !== '') {
        query.qty = { ...query.qty, $lte: Number(maxQty) };
    }

    if (status !== undefined && status !== 'All') {
        query.is_active = status === 'active';
    }

    let sort = { createdAt: -1 };
    if (sortBy && order && order !== 'none') {
        sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    }

    return await Ingredient.find(query).sort(sort);
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