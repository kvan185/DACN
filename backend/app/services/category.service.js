const db = require("../models");
const Category = db.category;
const fs = require("fs");
const path = require("path");
const generateSlug = require("../helpers/generateSlug");
const findCategoryFolder = require("../helpers/findCategoryFolder");
const DIR = path.join(__dirname, "../../static/images");

exports.create = async (data, file) => {
    if (!data.name) {
        throw { status: 400, message: "Category name is required" };
    }

    const category = new Category({
        name: data.name,
        image: file ? file.filename : null
    });

    const saved = await category.save();

    const slug = generateSlug(saved.name);
    const oldPath = path.join(DIR, slug);
    const newPath = path.join(DIR, `${slug}_${saved._id}`);

    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
    }

    return saved;
};

exports.getList = async () => {
    return await Category.find({});
};

exports.getById = async (id) => {
    const category = await Category.findById(id);
    if (!category) {
        throw { status: 404, message: "Category not found" };
    }
    return category;
};

exports.update = async (id, data, file) => {
    const category = await Category.findById(id);

    if (!category) {
        throw { status: 404, message: "Category not found" };
    }

    category.name = data.name || category.name;

    if (file) {
        category.image = file.filename;
    }

    await category.save();
    return category;
};

exports.delete = async (id) => {
    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
        throw { status: 404, message: "Category not found" };
    }

    return true;
};