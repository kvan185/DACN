const multer = require('multer');
const Recommender = require('../helpers/recommender.helper.js')
const db = require("../models");
const Product = db.product;
const middlewares = require("./auth.middlewares");
const generateImageName = require("../helpers/generateImageName");
const findCategoryFolder = require('../helpers/findCategoryFolder');
const slugifyVietnamese = require("../helpers/slugifyVietnamese");
const fs = require("fs");
const path = require("path");
const BASE_DIR = path.join(__dirname, "../../static/images");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
  const { category_id } = req.body;
  if (!category_id) return cb(new Error("category_id is required"));

  const folderName = findCategoryFolder(category_id.toString());
  if (!folderName) {
    return cb(new Error("Category image folder not found."));
  }

  cb(null, path.join(BASE_DIR, folderName));
},

  filename: (req, file, cb) => {
  cb(null, generateImageName(file.originalname, req.body.name));
}

});


const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/png","image/jpg","image/jpeg"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .png, .jpg and .jpeg format allowed!"), false);
    }
  }
});

exports.create = async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).send({ message: err.message });
      }

      if (!req.body.name || !req.body.category_id || !req.body.price) {
        return res.status(400).send({
          message: "Name, category_id, and price are required fields."
        });
      }

      if (!req.file) {
        return res.status(400).send({
          message: "Product image is required."
        });
      }

      const product = new Product({
        name: req.body.name,
        category_id: req.body.category_id,
        detail: req.body.detail || null,
        price: req.body.price,
        image: req.file.filename, // 👈 luôn có
        is_active: req.body.is_active ?? true
      });

      const savedProduct = await product.save();
      res.status(201).send(savedProduct);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "An error occurred while processing your request."
    });
  }
};

exports.getList = async (req, res) => {
  try {
    // console.log("[getList] Start");
    const products = await Product.find();
    // console.log("[getList] Total products:", products.length);
    res.status(200).json(products);
  } catch (error) {
    console.error("[getList] Error:", error);
    res.status(500).send({ message: "Server error" });
  }
};

exports.getListByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "null") return res.json([]);

    // console.log("[getListByCategory] categoryId:", id);

    const products = await Product.find({ category_id: id });
    const folder = findCategoryFolder(id);
    // console.log("Folder:", folder);

    const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
    const result = products.map(product => {
      const slugName = slugifyVietnamese(product.name);
      let image_url = null;

      if (folder && slugName) {
        for (const ext of IMAGE_EXTENSIONS) {
          const filePath = path.join(
            __dirname,
            `../../static/images/${folder}/${slugName}.${ext}`
          );

          if (fs.existsSync(filePath)) {
            image_url = `/static/images/${folder}/${slugName}.${ext}`;

            // console.log(
            //   "[Image found]",
            //   product.name,
            //   "→",
            //   image_url
            // );
            break;
          }
        }
      }

      // if (!image_url) {
      //   console.log(
      //     "[Image missing]",
      //     product.name,
      //     { folder, slugName }
      //   );
      // }

      const productObj = {
        ...product.toObject(),
        image_url
      };

      // console.log("[Response Object]:", productObj);

      return productObj;
    });

    // console.log("[getListByCategory] Result length:", result.length);
    res.status(200).json(result);

  } catch (error) {
    console.error("[getListByCategory] Error:", error);
    res.status(500).send({ message: "Server error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("[getProductById] productId:", id);

    const product = await Product.findById(id);
    if (!product) {
      // console.log("Product not found:", id);
      return res.status(404).json({ message: "Product not found." });
    }

    const folder = findCategoryFolder(product.category_id);
    // console.log("Folder:", folder);

    const slugName = slugifyVietnamese(product.name);
    // console.log("[Slug]:", slugName);

    let image_url = null;

    if (folder && slugName) {
      const exts = [".jpg", ".jpeg", ".png", ".webp"];

      for (const ext of exts) {
        const filePath = path.join(
          __dirname,
          "../../static/images",
          folder,
          `${slugName}${ext}`
        );

        if (fs.existsSync(filePath)) {
          image_url = `/static/images/${folder}/${slugName}${ext}`;
          break;
        }
      }
    }

    // // Log kết quả ảnh
    // if (image_url) {
    //   console.log(
    //     "[Image URL created]",
    //     product.name,
    //     "→",
    //     image_url
    //   );
    // } else {
    //   console.log(
    //     "[Image URL missing]",
    //     product.name,
    //     { folder, slugName }
    //   );
    // }

    const productObj = {
      ...product.toObject(),
      image_url
    };

    // Log object trả về FE
    // console.log("[Response Object]:", productObj);

    res.status(200).json(productObj);
  } catch (error) {
    console.error("[getProductById] Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.recommender = async (req, res) => {
  try {
    // console.log("[recommender] Start");

    const auth = await middlewares.checkAuth(req);
    if (!auth) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    // Lấy danh sách product được recommend
    const topProduct = await Recommender.recommender(auth);
    const listProductId = topProduct.map(item => item[0]);

    // console.log("[Recommended product IDs]:", listProductId);

    const products = await Product.find({
      _id: { $in: listProductId }
    });

    // // console.log("[Products fetched]:", products.length);

    // Lấy danh sách categoryId duy nhất
    const categoryIds = [
      ...new Set(products.map(p => String(p.category_id)))
    ];

    // Tìm folder cho từng category (chỉ 1 lần)
    const folderMap = {};
    categoryIds.forEach(categoryId => {
      folderMap[categoryId] = findCategoryFolder(categoryId);
    });

    // console.log("Folder map:", folderMap);

    // Build kết quả + dò ảnh thật
    const result = products.map(product => {
      const categoryId = String(product.category_id);
      const folder = folderMap[categoryId];
      const slugName = slugifyVietnamese(product.name);

      let image_url = null;

      if (folder && slugName) {
        const exts = [".jpg", ".jpeg", ".png", ".webp"];

        for (const ext of exts) {
          const filePath = path.join(
            __dirname,
            "../../static/images",
            folder,
            `${slugName}${ext}`
          );

          if (fs.existsSync(filePath)) {
            image_url = `/static/images/${folder}/${slugName}${ext}`;
            break;
          }
        }
      }

      // Log ảnh
      // if (image_url) {
      //   console.log(
      //     "[Image URL created]",
      //     product.name,
      //     "→",
      //     image_url
      //   );
      // } else {
      //   console.log(
      //     "[Image URL missing]",
      //     product.name,
      //     { folder, slugName }
      //   );
      // }

      const productObj = {
        ...product.toObject(),
        image_url
      };

      // Log object trả về FE
      // console.log("[Response Object]:", productObj);

      return productObj;
    });

    // console.log("[recommender] Result length:", result.length);
    res.status(200).json(result);

  } catch (error) {
    console.error("[recommender] Error:", error);
    res.status(500).json({
      message: "An error occurred while processing your request."
    });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    upload.single("image")(req, res, async (err) => {
      if (err) {
        return res.status(400).send({ message: err.message });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).send({ message: "Product not found" });
      }

      const oldImage = product.image;
      const oldCategoryId = product.category_id.toString();

      // Update fields
      product.name = req.body.name ?? product.name;
      product.category_id = req.body.category_id ?? product.category_id;
      product.detail = req.body.detail ?? product.detail;
      product.price = req.body.price ?? product.price;

      // Nếu upload ảnh mới
      if (req.file) {
        product.image = req.file.filename;

        const oldFolder = findCategoryFolder(oldCategoryId);
        if (oldFolder && oldImage) {
          const oldImagePath = path.join(BASE_DIR, oldFolder, oldImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      await product.save();
      res.status(200).json(product);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send({ message: "Product not found." });
    }

    const folder = findCategoryFolder(product.category_id);

    if (folder && product.image) {
      const imagePath = path.join(BASE_DIR, folder, product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Product.findByIdAndDelete(id);

    res.status(200).send({ message: "Product deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "An error occurred while processing your request."
    });
  }
};


exports.search = async (req, res) => {
  try {
    const keyValue = req.params.key;
    const regex = new RegExp(keyValue, "i");

    const products = await Product.find({ name: regex });

    const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

    const result = products.map(product => {
      const folder = findCategoryFolder(product.category_id);
      const slugName = slugifyVietnamese(product.name);

      let image_url = null;

      if (folder && slugName) {
        for (const ext of IMAGE_EXTENSIONS) {
          const filePath = path.join(
            __dirname,
            "../../static/images",
            folder,
            `${slugName}${ext}`
          );

          if (fs.existsSync(filePath)) {
            image_url = `/static/images/${folder}/${slugName}${ext}`;
            break;
          }
        }
      }

      return {
        ...product.toObject(),
        image_url
      };
    });

    res.status(200).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "An error occurred while processing your request."
    });
  }
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}