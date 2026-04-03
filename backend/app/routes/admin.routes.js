module.exports = app => {
    const adminController = require("../controllers/admin.controller.js");
  
    var router = require("express").Router();
  
    // Update profile
    router.put("/profile", adminController.updateProfile);
  
    // Update avatar
    router.put("/update-avatar", adminController.updateAvatar);
  
    app.use("/api/admin", router);
};
