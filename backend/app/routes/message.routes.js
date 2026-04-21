module.exports = app => {
    const messageController = require("../controllers/message.controller.js");
    const router = require("express").Router();

    // POST: Upload file
    router.post("/upload", messageController.uploadFile);

    // GET: Get message history
    router.get("/history", messageController.getHistory);

    // GET: Get conversation list
    router.get("/conversations", messageController.getConversations);
    router.get("/unread-count-customer", messageController.getUnreadCountForCustomer);

    // PUT: Mark as read
    router.put("/read", messageController.markAsRead);

    // GET: Find user by email
    router.get("/find-by-email", messageController.findByEmail);

    app.use("/api/messages", router);
};
