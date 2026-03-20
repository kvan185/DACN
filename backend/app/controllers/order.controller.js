const orderService = require("../services/order.service"); const middlewares = require("./auth.middlewares");

const handleError = (res, error) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.message || "Server error",
    });
};

// CREATE
exports.createCashOrder = async (req, res) => {
    try {
        const { cartId, tableNumber } = req.body;

        const order = await orderService.createCashOrder(
            cartId,
            tableNumber
        );

        res.json({
            success: true,
            message: "Order created successfully.",
            order,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// GET LIST
exports.getListOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        const data = await orderService.getListOrder(auth);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

// GET ONE
exports.getOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        const data = await orderService.getOrder(req.params.orderId);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

// UPDATE STATUS
exports.updateStatusOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) throw { status: 401, message: "Authentication failed" };

        const { orderId, status } = req.body;

        const order = await orderService.updateStatusOrder(orderId, status);

        await orderService.emitOrderUpdate(order);

        res.json({ message: "Updated status." });
    } catch (error) {
        handleError(res, error);
    }
};

// PAYMENT
exports.updateIsPayment = async (req, res) => {
    try {
        const { orderId, isPayment } = req.body;

        const order = await orderService.updateIsPayment(
            orderId,
            isPayment
        );

        res.json({ order });
    } catch (error) {
        handleError(res, error);
    }
};