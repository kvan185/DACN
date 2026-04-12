module.exports = app => {
  const order = require("../controllers/order.controller.js");

  var router = require("express").Router();

  // create cash order
  router.post("/", order.createCashOrder);
  router.post("/guest", order.createGuestOrder);

  // get list order
  router.get("/", order.getListOrder);
  router.get("/guest/table/:tableNumber", order.getGuestOrdersByTable);
  router.put("/guest/table/:tableNumber/payment", order.payGuestOrdersByTable);

  // get order
  router.get("/:orderId", order.getOrder);

  // update status order
  router.post("/status", order.updateStatusOrder);

  // update status payment
  router.post("/status/payment", order.updateIsPayment);
  router.post("/call-staff", order.callStaff);

  app.use("/api/order", router);
};
