
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static folder
app.use(
  "/static",
  express.static(path.join(__dirname, "static"))
);

// database
const db = require("./app/models");
db.mongoose.set("strictQuery", false);

db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// test route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to application." });
});

// routes
require("./app/routes/customer.routes")(app);
require("./app/routes/login.routes")(app);
require("./app/routes/category.routes")(app);
require("./app/routes/product.routes")(app);
require("./app/routes/productBom.routes")(app);
require("./app/routes/ingredient.routes")(app);
require("./app/routes/cart.routes")(app);
require("./app/routes/order.routes")(app);
require("./app/routes/paymnet.routes")(app);
require("./app/routes/revenue.routes")(app);
require("./app/routes/table.routes")(app);
require("./app/routes/reservation.routes")(app);

// create server
const server = http.createServer(app);

// socket
const { initSocket } = require("./app/socket");
const io = initSocket(server);

// gắn socket vào app để controller dùng
app.set("socket", io);

// start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server + Socket running on port ${PORT} `);
});
