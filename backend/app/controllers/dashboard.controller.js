const dashboardService = require("../services/dashboard.service");

const handleError = (res, error) => {
  console.error(error);
  res.status(500).json({
    message: error.message || "Server error"
  });
};

exports.getStats = async (req, res) => {
  try {
    const data = await dashboardService.getStats();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.topProducts = async (req, res) => {
  try {
    const data = await dashboardService.topProducts();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.topCustomers = async (req, res) => {
  try {
    const data = await dashboardService.topCustomers();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.productsByCategory = async (req, res) => {
  try {
    const data = await dashboardService.productsByCategory();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.categorySales = async (req, res) => {
  try {
    const data = await dashboardService.categorySales();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};

exports.revenueTrend = async (req, res) => {
  try {
    const data = await dashboardService.revenueTrend();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
};