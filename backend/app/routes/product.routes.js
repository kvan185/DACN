module.exports = app => {
  const product = require("../controllers/product.controller.js");

  var router = require("express").Router();

  router.get("/recommender", product.recommender);
  router.post("/", product.create);
  router.get("/", product.getList);
  router.get("/category/:id", product.getListByCategory);
  router.get("/:id", product.getProductById);
  router.put('/:id', product.update);
  router.delete('/:id', product.delete);
  router.get("/search/:key", product.search);

  app.use("/api/product", router);
};