const db = require("../models");

const Product = db.product;
const Customer = db.customer;
const Order = db.order;

exports.getStats = async () => {

  // tổng món ăn
  const totalProducts = await Product.countDocuments({
    is_active: true
  });

  // tổng khách hàng
  const totalCustomers = await Customer.countDocuments();

  // đơn thành công
  const successOrders = await Order.countDocuments({
    status: "COMPLETED"
  });

  // tổng đơn (không tính hủy)
  const totalOrders = await Order.countDocuments({
    status: { $ne: "CANCELED" }
  });

  // doanh thu tháng
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const revenue = await Order.aggregate([
    {
      $match: {
        status: { $ne: "CANCELED" },
        createdAt: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        revenueMonth: { $sum: "$total_price" }
      }
    }
  ]);

  return {
    totalProducts,
    totalCustomers,
    successOrders,
    totalOrders,
    revenueMonth: revenue.length ? revenue[0].revenueMonth : 0
  };
};