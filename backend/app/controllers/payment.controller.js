const paymentService = require("../services/payment.service");

const handleError = (res, error) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.message || "Server error",
    });
};

const createPaymentUrl = async (req, res) => {
    try {
        const ipAddr =
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress;

        const url = await paymentService.createPaymentUrl(
            req.body.cartId,
            req.body.bankCode,
            ipAddr
        );

        res.json({ paymentUrl: url });
    } catch (error) {
        handleError(res, error);
    }
};

const vnpayReturn = async (req, res) => {
    try {
        const result = paymentService.vnpayReturn(req.query);

        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
};

module.exports = {
    createPaymentUrl,
    vnpayReturn,
};