const { Server } = require("socket.io");
const actionHelper = require("../helpers/action.helper.js");
const Table = require("../models/table.model.js");

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

  // export để dùng tiếp
  const listSocket = {};
  listSocket.updateOrder = require("./process.order.js")(io);

  return listSocket;
};
