const multer = require("multer");
const productService = require("../services/product.service");
const middlewares = require("./auth.middlewares");
const generateImageName = require("../helpers/generateImageName");
const findCategoryFolder = require("../helpers/findCategoryFolder");
const path = require("path");

const BASE_DIR = path.join(__dirname, "../../static/images");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = findCategoryFolder(req.body.category_id);
    cb(null, path.join(BASE_DIR, folder));
  },
  filename: (req, file, cb) => {
    cb(null, generateImageName(file.originalname, req.body.name));
  },
});

const upload = multer({ storage });

const handleError = (res, error) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Server error",
  });
};

exports.create = (req, res) => {
  upload.single("image")(req, res, async (err) => {
    try {
      if (err) throw { status: 400, message: err.message };

      const result = await productService.create(req.body, req.file);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  });
};

exports.getList = async (req, res) => {
  try {
    const data = await productService.getList();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getListByCategory = async (req, res) => {
  try {
    const data = await productService.getListByCategory(req.params.id);
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getProductById = async (req, res) => {
  try {
    const data = await productService.getById(req.params.id);
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.recommender = async (req, res) => {
  try {
    const auth = await middlewares.checkAuth(req);
    if (!auth) throw { status: 401, message: "Authentication failed" };

    const data = await productService.recommender(auth);
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.update = (req, res) => {
  upload.single("image")(req, res, async (err) => {
    try {
      if (err) throw { status: 400, message: err.message };

      const result = await productService.update(
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
    await productService.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
};

exports.search = async (req, res) => {
  try {
    const data = await productService.search(req.params.key);
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};