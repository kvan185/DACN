require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
const path = require('path');

app.use(
  "/static",
  express.static(path.join(__dirname, "static"))
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  
// routes test
app.get("/", (req, res) => {
  res.json({ message: "Welcome to application." });
});

require("./app/routes/customer.routes")(app);
require("./app/routes/login.routes")(app);
require("./app/routes/category.routes")(app);
require("./app/routes/product.routes")(app);
// require("./app/routes/productBom.routes")(app);
require("./app/routes/cart.routes")(app);
require("./app/routes/order.routes")(app);
require("./app/routes/paymnet.routes")(app);
require("./app/routes/revenue.routes")(app);
require("./app/routes/table.routes")(app);
require("./app/routes/reservation.routes")(app);
require("./app/routes/dashboard.routes")(app);

const http = require("http");
const server = http.createServer(app);

// gắn socket vào server
require("./app/socket")(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server + Socket running on port ${PORT}`);
});
