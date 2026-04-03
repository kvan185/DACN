const fs = require("fs");
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/food_order")
  .then(async () => {
    console.log("Connected to MongoDB.");

    // Reading the problematic JSON file
    const rawData = fs.readFileSync("./data/food_order.products.json", "utf8");
    const orderItems = JSON.parse(rawData);

    // If orderItems does not look like Order Items, we should abort
    if (orderItems.length > 0 && !orderItems[0].product_name) {
        console.log("Data in food_order.products.json does not seem to have product_name... aborting.");
        process.exit(1);
    }

    // Save it as proper orderItems backup
    fs.writeFileSync("./data/food_order.order_items.json", JSON.stringify(orderItems, null, 2));

    // Extract unique products
    const productsMap = {};
    for (const item of orderItems) {
        if (!productsMap[item.product_id.$oid]) {
            productsMap[item.product_id.$oid] = {
                _id: new mongoose.Types.ObjectId(item.product_id.$oid),
                name: item.product_name,
                image: item.product_image,
                detail: "Chi tiết công thức của " + item.product_name,
                price: item.price,
                // Assuming "6752d60ec50b10fa72808001" is a valid category (e.g., Salad & Rau củ)
                category_id: new mongoose.Types.ObjectId("6752d60ec50b10fa72808001"),
                is_active: item.is_active,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt)
            };
        }
    }
    const products = Object.values(productsMap);

    // Save proper products file
    const exportProducts = products.map(p => ({
        _id: { "$oid": p._id.toString() },
        name: p.name,
        image: p.image,
        detail: p.detail,
        price: p.price,
        category_id: { "$oid": p.category_id.toString() },
        is_active: p.is_active,
        createdAt: { "$date": p.createdAt.toISOString() },
        updatedAt: { "$date": p.updatedAt.toISOString() }
    }));
    fs.writeFileSync("./data/food_order.products.json", JSON.stringify(exportProducts, null, 2));

    // Wait, let's fix the Mongoose models by directly inserting via Mongoose models
    console.log(`Extracted ${products.length} unique products.`);

    // Access raw collections to drop them
    const db = mongoose.connection.db;

    console.log("Dropping existing products and order_items...");
    await db.collection("products").deleteMany({});
    await db.collection("order_items").deleteMany({});

    console.log("Inserting pure products into products collection...");
    await db.collection("products").insertMany(products);

    console.log("Inserting order items into order_items collection...");
    const mongoOrderItems = orderItems.map(item => ({
        _id: item._id ? new mongoose.Types.ObjectId(item._id.$oid) : new mongoose.Types.ObjectId(),
        order_id: new mongoose.Types.ObjectId(item.order_id.$oid),
        product_id: new mongoose.Types.ObjectId(item.product_id.$oid),
        product_name: item.product_name,
        product_image: item.product_image,
        qty: item.qty,
        price: item.price,
        total_price: item.total_price,
        is_active: item.is_active,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
    }));
    await db.collection("order_items").insertMany(mongoOrderItems);

    console.log("Success! Fixed the database. You can safely close the process now.");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
