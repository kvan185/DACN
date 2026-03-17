const dashboardHelper = require("../helpers/dashboard.helper");
const db = require("../models");

exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardHelper.getStats();
    res.send(stats);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Error retrieving dashboard statistics"
    });
  }
};

exports.topProducts = async (req, res) => {
  try {
    const OrderItem = db.order_item;
    const data = await OrderItem.aggregate([
      {
        $match: { is_active: true }
      },
      {
        $group: {
          _id: "$product_id",
          name: { $first: "$product_name" },
          image: { $first: "$product_image" },
          totalSold: { $sum: "$qty" }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      },
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

    res.status(200).json(data);

  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({
      message: "Error retrieving top products",
      error: err.message
    });
  }
};

exports.topCustomers = async (req, res) => {
  try {
    const Order = db.order;

    const data = await Order.aggregate([
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
          name: {
            $concat: ["$first_name", " ", "$last_name"]
          },
          totalSpent: 1
        }
      }
    ]);

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};
exports.productsByCategory = async (req, res) => {
  try {
    const Product = db.product;

    const data = await Product.aggregate([
      {
        $match: { is_active: true }
      },

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

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

exports.categorySales = async (req, res) => {
  try {
    const OrderItem = db.order_item;

    const data = await OrderItem.aggregate([
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

    res.json(data);
  } catch (err) {
    res.status(500).send(err);
  }
};
exports.revenueTrend = async (req, res) => {
  try {
    const Order = db.order;

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const data = await Order.aggregate([
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
      {
        $sort: { "_id": 1 }
      }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).send(err);
  }
};