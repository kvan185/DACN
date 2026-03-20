const ProductBOM = require("../models/productBom.model");
const mongoose = require("mongoose");

exports.getByProduct = async (productId) => {
    const objectId = new mongoose.Types.ObjectId(productId);

    return await ProductBOM.find({
        product_id: objectId,
    }).populate({
        path: "ingredient_id",
        select: "name unit qty",
    });
};

exports.create = async (data) => {
    return await ProductBOM.create(data);
};

exports.update = async (id, data) => {
    const updated = await ProductBOM.findByIdAndUpdate(id, data, {
        new: true,
    });

    if (!updated) {
        throw { status: 404, message: "Không tìm thấy BOM" };
    }

    return updated;
};

exports.remove = async (id) => {
    const deleted = await ProductBOM.findByIdAndDelete(id);

    if (!deleted) {
        throw { status: 404, message: "Không tìm thấy BOM" };
    }

    return true;
};

exports.getList = async () => {
    return await ProductBOM.find();
};