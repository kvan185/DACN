module.exports = app => {
    // Kiểm tra xem controller có tồn tại không
    let adminCustomer;
    try {
        adminCustomer = require("../controllers/admin.customer.controller.js");
        console.log("Admin customer controller loaded:", Object.keys(adminCustomer));
    } catch (error) {
        console.error("Error loading admin customer controller:", error);
        return;
    }

    var router = require("express").Router();

    // Kiểm tra từng function trước khi dùng
    if (!adminCustomer.getCustomers) {
        console.error("getCustomers function is missing!");
        return;
    }

    // Tạo khách hàng mới
    if (adminCustomer.createCustomer) {
        router.post("/create", adminCustomer.createCustomer);
    } else {
        console.error("createCustomer function is missing!");
    }

    // Lấy danh sách khách hàng
    router.get("/", adminCustomer.getCustomers);


    // Lấy chi tiết khách hàng
    if (adminCustomer.getCustomerById) {
        router.get("/:id", adminCustomer.getCustomerById);
    } else {
        console.error("getCustomerById function is missing!");
    }

    // Cập nhật khách hàng
    if (adminCustomer.updateCustomer) {
        router.put("/:id", adminCustomer.updateCustomer);
    } else {
        console.error("updateCustomer function is missing!");
    }

    if (adminCustomer.toggleCustomerStatus) {
        router.put("/toggle-status/:id", adminCustomer.toggleCustomerStatus);
        console.log("Toggle status route registered");
    } else {
        console.error("toggleCustomerStatus function is missing!");
    }

    app.use("/api/admin/customer", router);
    console.log("Admin customer routes registered successfully");
};