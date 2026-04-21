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
  router.get("/guest/table/:tableNumber/active-guests", order.getActiveGuests);
  router.post("/guest/join", order.joinGuestSession);
  router.get("/multi-tables", order.getOrdersByMultiTables);

  // get order
  router.get("/:orderId", order.getOrder);

  // update status order
  router.post("/status", order.updateStatusOrder);

  // update status payment
  router.post("/status/payment", order.updateIsPayment);
  router.post("/call-staff", order.callStaff);
  router.post("/reset-support", order.resetSupportRequest);

  router.put("/:id/items/:itemId/status", order.updateOrderItemStatus);
  router.post("/merge", order.mergeOrders);

  app.use("/api/order", router);
};
