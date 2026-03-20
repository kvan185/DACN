const dashboardHelper = require("../helpers/dashboard.helper");
const db = require("../models");

const getStats = async () => {
    return await dashboardHelper.getStats();
};

const topProducts = async () => {
    const OrderItem = db.order_item;

    return await OrderItem.aggregate([
        { $match: { is_active: true } },
        {
            $group: {
                _id: "$product_id",
                name: { $first: "$product_name" },
                image: { $first: "$product_image" },
                totalSold: { $sum: "$qty" }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 0,
                product_id: "$_id",
                name: 1,
                image: 1,
                totalSold: 1
            }
        }
    ]);
};

const topCustomers = async () => {
    const Order = db.order;

    return await Order.aggregate([
        { $match: { is_active: true } },
        {
            $group: {
                _id: "$customer_id",
                first_name: { $first: "$first_name" },
                last_name: { $first: "$last_name" },
                totalSpent: { $sum: "$total_price" }
            }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                customer_id: "$_id",
                name: { $concat: ["$first_name", " ", "$last_name"] },
                totalSpent: 1
            }
        }
    ]);
};

const productsByCategory = async () => {
    const Product = db.product;

    return await Product.aggregate([
        { $match: { is_active: true } },
        {
            $group: {
                _id: "$category_id",
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" },
        {
            $project: {
                _id: 0,
                category_id: "$_id",
                name: "$category.name",
                count: 1
            }
        }
    ]);
};

const categorySales = async () => {
    const OrderItem = db.order_item;

    return await OrderItem.aggregate([
        {
            $lookup: {
                from: "products",
                localField: "product_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.category_id",
                totalSold: { $sum: "$qty" }
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" },
        {
            $project: {
                name: "$category.name",
                totalSold: 1
            }
        },
        { $sort: { totalSold: -1 } }
    ]);
};

const revenueTrend = async () => {
    const Order = db.order;

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: start },
                is_active: true
            }
        },
        {
            $group: {
                _id: { $dayOfMonth: "$createdAt" },
                revenue: { $sum: "$total_price" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);
};

module.exports = {
    getStats,
    topProducts,
    topCustomers,
    productsByCategory,
    categorySales,
    revenueTrend
};