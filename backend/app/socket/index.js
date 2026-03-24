const { Server } = require("socket.io");
const actionHelper = require("../helpers/action.helper.js");
const Table = require("../models/table.model.js");
const tableController = require("../controllers/table.controller.js");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("userConnect", (userId) => {
      actionHelper.updateSocket(userId, socket.id);
    });

    socket.on("adminConnect", (userId) => {
      actionHelper.updateAdminSocket(userId, socket.id);
    });

    socket.on("tableChange", async () => {
      try {
        const tables = await Table.find().sort({ tableNumber: 1 });
        io.emit("tableUpdated", tables);
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  // Tự động kiểm tra và giải phóng bàn sau mỗi 1 phút
  setInterval(async () => {
    try {
      // Hàm này đã bao gồm logic updateMany để hủy các đơn quá hạn
      const tables = await tableController.getTablesListInternal();
      // Luôn phát sóng để đảm bảo UI khách hàng và admin đồng bộ theo thời gian thực
      io.emit("tableUpdated", tables);
    } catch (error) {
      console.error("Error in auto-cleanup interval:", error);
    }
  }, 60000);

  // attach io to the the export itself so it can be dynamically accessed by controllers later
  module.exports.updateOrder = require("./process.order.js")(io);

  return io;
};
