const middlewares = require("./auth.middlewares");
const cartService = require("../services/cart.service");

const handleError = (res, error) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.message || "Server error",
    });
};

exports.initOrRetrieveCart = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        const data = await cartService.initOrRetrieveCart(auth.id);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

exports.addProductToCart = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        await cartService.addProductToCart(auth.id, req.body.listItem);

        res.json({ message: "Add Product to Cart successfully" });
    } catch (error) {
        handleError(res, error);
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        await cartService.updateCartItem(auth.id, req.body.listItem);

        res.json({ message: "Updated Cart successfully" });
    } catch (error) {
        handleError(res, error);
    }
};

exports.getCart = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        const data = await cartService.getCart(auth.id);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

exports.deleteCartItem = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        await cartService.deleteCartItem(auth.id, req.params.id);

        res.json({ message: "Cart item deleted successfully" });
    } catch (error) {
        handleError(res, error);
    }
};