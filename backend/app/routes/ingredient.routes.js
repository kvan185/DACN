module.exports = app => {

    const controller = require("../controllers/ingredient.controller");

    const router = require("express").Router();

    router.get("/", controller.getAll);
    router.post("/", controller.create);
    router.put("/:id", controller.update);
    router.delete("/:id", controller.remove);

    app.use("/api/ingredient", router);

};