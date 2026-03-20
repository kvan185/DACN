
module.exports = app => {
  const cart = require("../controllers/cart.controller.js");

  var router = require("express").Router();

  router.post("/", cart.initOrRetrieveCart);
  router.post("/add", cart.addProductToCart);
  router.post("/update", cart.updateCartItem);
  router.get("/", cart.getCart);
  router.delete("/:id", cart.deleteCartItem);
  // router.get("/validate", cart.validateCart);
  app.use("/api/cart", router);
};
