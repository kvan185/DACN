module.exports = app => {
    const payment = require("../controllers/payment.controller.js");
  
    var router = require("express").Router();
  
    // Create
    router.post("/", payment.createPaymentUrl);
    router.post("/guest", payment.createGuestPaymentUrl);
    router.post("/table", payment.createTablePaymentUrl);
    router.post("/split", payment.splitBill);
    router.post("/split/pay", payment.createSplitPaymentUrl);

    // return
    router.post("/webhook", payment.receiveWebhook);
    router.get("/status/:payosOrderCode", payment.getOrderStatus);

    app.use("/api/payment", router);
  };
  