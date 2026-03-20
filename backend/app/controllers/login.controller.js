const authService = require("../services/auth.service");

const handleError = (res, error) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.message || "Server error",
    });
};

exports.login = async (req, res) => {
    try {
        const data = await authService.login(req.body);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

exports.register = async (req, res) => {
    try {
        const data = await authService.register(req.body);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const data = await authService.refreshToken(req.body);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const data = await authService.createAdmin(req.body);
        res.json(data);
    } catch (error) {
        handleError(res, error);
    }
};