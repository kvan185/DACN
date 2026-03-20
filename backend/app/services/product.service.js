const ProductBOM = require("../models/productBom.model");
const db = require("../models");
const Ingredient = db.ingredient;
const Product = db.product;

const checkProductAvailability = async (productId) => {
    const boms = await ProductBOM.find({ product_id: productId });

    let isActive = true;

    for (const bom of boms) {
        const ingredient = await Ingredient.findById(bom.ingredient_id);

        if (!ingredient || ingredient.qty < bom.quantity) {
            isActive = false;
            break;
        }
    }

    await Product.findByIdAndUpdate(productId, {
        is_active: isActive
    });

    return isActive;
};

const checkManyProducts = async (productIds) => {
    for (const id of productIds) {
        await checkProductAvailability(id);
    }
};

module.exports = {
    checkProductAvailability, checkManyProducts
};