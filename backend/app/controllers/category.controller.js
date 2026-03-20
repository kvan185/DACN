const multer = require("multer");
const path = require("path");
const fs = require("fs");
const categoryService = require("../services/category.service");
const generateSlug = require("../helpers/generateSlug");
const generateImageName = require("../helpers/generateImageName");
const findCategoryFolder = require("../helpers/findCategoryFolder");
const DIR = path.join(__dirname, "../static/images");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const categoryId = req.params.id || null;
      let folderName = null;

      if (categoryId) {
        folderName = findCategoryFolder(categoryId.toString());
      }

      if (!folderName) {
        if (!req.body.name) {
          return cb(new Error("Category name is required"));
        }

        const slug = generateSlug(req.body.name);
        folderName = slug;
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

const handleError = (res, error) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Server error"
  });
};

exports.create = (req, res) => {
  upload.single("image")(req, res, async (err) => {
    try {
      if (err) throw { status: 400, message: err.message };

      const result = await categoryService.create(req.body, req.file);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  });
};

exports.getList = async (req, res) => {
  try {
    const data = await categoryService.getList();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const data = await categoryService.getById(req.params.id);
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.update = (req, res) => {
  upload.single("image")(req, res, async (err) => {
    try {
      if (err) throw { status: 400, message: err.message };

      const result = await categoryService.update(
        req.params.id,
        req.body,
        req.file
      );

      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  });
};

exports.delete = async (req, res) => {
  try {
    await categoryService.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
};