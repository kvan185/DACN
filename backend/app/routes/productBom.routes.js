module.exports = app => {
    const productBom = require("../controllers/productBom.controller.js");

    var router = require("express").Router();

    // Create BOM cho product
    router.post("/", productBom.create);

    // Get BOM theo product
    router.get("/product/:productId", productBom.getByProduct);

    // Get toàn bộ BOM
    router.get("/", productBom.getList);

    // Update BOM
    router.put("/:id", productBom.update);

    // Delete BOM
    router.delete("/:id", productBom.remove);

    app.use("/api/productBom", router);
};