module.exports = app => {
    const productBom = require("../controllers/productBom.controller.js");

    var router = require("express").Router();

    router.post("/", productBom.create);
    router.get("/product/:productId", productBom.getByProduct);
    router.get("/", productBom.getList);
    router.put("/:id", productBom.update);
    router.delete("/:id", productBom.remove);

    app.use("/api/productBom", router);
};