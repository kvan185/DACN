const ProductBOM = require("../models/productBom.model");
const db = require("../models");
const Ingredient = db.ingredient;
const Product = db.product;
const Recommender = require("../helpers/recommender.helper");
const findCategoryFolder = require("../helpers/findCategoryFolder");
const slugifyVietnamese = require("../helpers/slugifyVietnamese");
const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "../../static/images");

const buildImageUrl = (product) => {
    const folder = findCategoryFolder(product.category_id);
    const slugName = slugifyVietnamese(product.name);

    let image_url = null;

    if (folder && slugName) {
        const exts = [".jpg", ".jpeg", ".png", ".webp"];

        for (const ext of exts) {
            const filePath = path.join(BASE_DIR, folder, `${slugName}${ext}`);

            if (fs.existsSync(filePath)) {
                image_url = `/static/images/${folder}/${slugName}${ext}`;
                break;
            }
        }
    }

    return {
        ...product.toObject(),
        image_url,
    };
};

const create = async (data, file) => {
    if (!data.name || !data.category_id || !data.price) {
        throw { status: 400, message: "Thiếu field" };
    }

    if (!file) {
        throw { status: 400, message: "Product image is required" };
    }

    const product = new Product({
        name: data.name,
        category_id: data.category_id,
        detail: data.detail || null,
        price: data.price,
        image: file.filename,
        is_active: data.is_active ?? true,
    });

    return await product.save();
};

const getList = async (searchQuery) => {
    let query = {};
    if (searchQuery) {
        query = {
             $or: [
                 { name: { $regex: searchQuery, $options: "i" } }
             ]
        };
        // Check if searchQuery is valid ObjectId
        if (searchQuery.match(/^[0-9a-fA-F]{24}$/)) {
            query.$or.push({ _id: searchQuery });
        }
    }
    return await Product.find(query).sort({ createdAt: -1 });
};

const getListByCategory = async (categoryId) => {
    if (!categoryId || categoryId === "null") return [];

    const products = await Product.find({ category_id: categoryId });
    return products.map(buildImageUrl);
};

const getById = async (id) => {
    const product = await Product.findById(id);

    if (!product) {
        throw { status: 404, message: "Product not found" };
    }

    return buildImageUrl(product);
};

const update = async (id, data, file) => {
    const product = await Product.findById(id);
    if (!product) {
        throw { status: 404, message: "Product not found" };
    }

    const oldImage = product.image;
    const oldCategoryId = product.category_id.toString();

    product.name = data.name ?? product.name;
    product.category_id = data.category_id ?? product.category_id;
    product.detail = data.detail ?? product.detail;
    product.price = data.price ?? product.price;

    if (file) {
        product.image = file.filename;

        const oldFolder = findCategoryFolder(oldCategoryId);
        if (oldFolder && oldImage) {
            const oldPath = path.join(BASE_DIR, oldFolder, oldImage);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
    }

    return await product.save();
};

const deleteProduct = async (id) => {
    const product = await Product.findById(id);

    if (!product) {
        throw { status: 404, message: "Product not found" };
    }

    const folder = findCategoryFolder(product.category_id);

    if (folder && product.image) {
        const imagePath = path.join(BASE_DIR, folder, product.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }

    await Product.findByIdAndDelete(id);
    return true;
};

const search = async (key) => {
    const regex = new RegExp(key, "i");
    const products = await Product.find({ name: regex });

    return products.map(buildImageUrl);
};

const recommender = async (auth) => {
    const topProduct = await Recommender.recommender(auth);
    const listProductId = topProduct.map((item) => item[0]);

    const products = await Product.find({
        _id: { $in: listProductId },
    });

    return products.map(buildImageUrl);
};

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
        is_active: isActive,
    });

    return isActive;
};

const checkManyProducts = async (productIds) => {
    for (const id of productIds) {
        await checkProductAvailability(id);
    }
};

module.exports = {
    create,
    getList,
    getListByCategory,
    getById,
    update,
    delete: deleteProduct,
    search,
    recommender,
    checkProductAvailability,
    checkManyProducts,
};