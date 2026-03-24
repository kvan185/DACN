module.exports = app => {
    const payment = require("../controllers/payment.controller.js");
  
    var router = require("express").Router();
  
    // Create
    router.post("/", payment.createPaymentUrl);
    router.post("/guest", payment.createGuestPaymentUrl);

    // return
    router.get("/vnpay_return", payment.vnpayReturn);

    app.use("/api/payment", router);
  };
  