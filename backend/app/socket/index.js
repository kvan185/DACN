const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Customer = require("../models/customer.model")(mongoose);

let io;

const initSocket = (server) => {

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {

    console.log("New client connected:", socket.id);

    socket.on("userConnect", async (userId) => {

      try {

        const customer = await Customer.findById(userId);

        if (customer) {
          customer.socket_id = socket.id;
          await customer.save();
        }

      } catch (error) {
        console.error(error);
      }

    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });

  });

};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};