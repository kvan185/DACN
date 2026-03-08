const multer = require('multer');
const db = require("../models");
const Category = db.category;

const fs = require("fs");
const path = require("path");

const generateSlug = require("../helpers/generateSlug");
const generateImageName = require("../helpers/generateImageName");
const findCategoryFolder = require('../helpers/findCategoryFolder');

const DIR = path.join(__dirname, '../static/images');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const categoryId = req.params.id || null;
      let folderName = null;

      // UPDATE → tìm folder cũ
      if (categoryId) {
        folderName = findCategoryFolder(categoryId.toString());
      }

      // CREATE → chưa có folder
      if (!folderName) {
        if (!req.body.name) {
          return cb(new Error("Category name is required"));
        }

        const slug = generateSlug(req.body.name);
        folderName = slug; // folder tạm, sẽ rename sau khi save
      }

      const uploadPath = path.join(DIR, folderName);
      fs.mkdirSync(uploadPath, { recursive: true });

      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    cb(null, generateImageName(file.originalname, req.body.name));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpg", "image/jpeg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .png, .jpg, .jpeg allowed"));
    }
  }
});


exports.create = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).send({ message: err.message });
      }

      if (!req.body.name) {
        return res.status(400).send({ message: "Category name is required." });
      }

      const category = new Category({
        name: req.body.name,
        image: req.file ? req.file.filename : null
      });

      const savedCategory = await category.save();

      const slug = generateSlug(savedCategory.name);
      const oldPath = path.join(DIR, slug);
      const newPath = path.join(DIR, `${slug}_${savedCategory._id}`);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }

      res.status(201).send(savedCategory);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Server error" });
    }
  });
};


exports.getList = async (req, res) => {
    try {
        const categories = await Category.find({});
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send({ message: "Category not found." });
        }
        res.status(200).json(category);
    } catch (error) {
        console.error(error);
        if (error.kind === "ObjectId") {
            return res.status(404).send({ message: "Category not found." });
        }
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.update = async (req, res) => {
    const id = (req.params.id === 'null' ? undefined : req.params.id);

    try {
        upload.single('image')(req, res, async (err) => {
            if (err) {
                console.error(err);
                return res.status(400).send({ message: err.message });
            }

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).send({ message: `Category with id ${id} not found` });
            }

            // Update fields
            category.name = req.body.name || category.name;
            category.image = req.file ? req.file.filename : category.image;

            // Save changes
            await category.save();

            // Return updated category
            res.send(category);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.delete = async (req, res) => {
    const id = (req.params.id === 'null' ? undefined : req.params.id);

    try {
        const deletedCategory = await Category.findByIdAndDelete(id);
        if (!deletedCategory) {
            return res.status(404).send({ message: "Category not found." });
        }
        res.status(200).send({ message: "Category deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};
