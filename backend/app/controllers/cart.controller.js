const middlewares = require("./auth.middlewares");
const db = require("../models");
const Product = db.product;
const Cart = db.cart;
const CartItem = db.cartItem;
const findCategoryFolder = require("../helpers/findCategoryFolder");
const slugifyVietnamese = require("../helpers/slugifyVietnamese");
const fs = require("fs");
const path = require("path");

const buildProductImageUrl = (product) => {
    if (!product) return null;

    const folder = findCategoryFolder(product.category_id);
    const slugName = slugifyVietnamese(product.name);

    if (!folder || !slugName) return null;

    const exts = [".jpg", ".jpeg", ".png", ".webp"];

    for (const ext of exts) {
        const filePath = path.join(
            __dirname,
            "../../static/images",
            folder,
            `${slugName}${ext}`
        );

        if (fs.existsSync(filePath)) {
            return `/static/images/${folder}/${slugName}${ext}`;
        }
    }

    return null;
};

exports.initOrRetrieveCart = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).send({ message: "Authentication failed" });
        }

        const customer_id = auth.id;
        const cart = await Cart.findOne({ customer_id: customer_id, is_active: true });

        if (!cart) {
            const newcart = new Cart({
                customer_id,
                total_item: 0,
                total_price: 0,
                is_active: true,
            });
            const savedCart = await newcart.save();
            return res.status(200).send({ message: "New cart created", cart: savedCart });
        } else {
            return res.status(200).send({ message: "Cart retrieved successfully", cart: cart });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.addProductToCart = async (req, res) => {
    try {
        // console.log("🛒 [addProductToCart] Start");

        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            console.warn("[Auth] Authentication failed");
            return res.status(401).send({ message: "Authentication failed" });
        }

        const customer_id = auth.id;
        // console.log("[Customer ID]:", customer_id);

        const cart = await Cart.findOne({
            customer_id,
            is_active: true
        });

        if (!cart) {
            console.warn("Cart not found for customer:", customer_id);
            return res.status(404).json({ message: "Cart not found" });
        }

        // console.log("Cart ID:", cart.id);

        const listItem = req.body.listItem;
        // console.log("Incoming listItem:", listItem);

        if (listItem && Array.isArray(listItem)) {
            await Promise.all(
                listItem.map(async (item, index) => {
                    const { id, qty } = item;
                    // console.log(`➡️ [Item ${index}]`, { productId: id, qty });

                    const product = await Product.findById(id);
                    if (!product) {
                        console.error(`Product not found: ${id}`);
                        return;
                    }

                    if (qty <= 0) {
                        console.warn(`Invalid qty for product ${id}:`, qty);
                        return;
                    }

                    const price = product.price;
                    const image_url = buildProductImageUrl(product);

                    // console.log("Product image URL:", image_url);

                    const cartItem = await CartItem.findOne({
                        cart_id: cart.id,
                        product_id: id
                    });

                    if (cartItem) {
                        // console.log("🔁 Update existing cart item:", cartItem.id);

                        cartItem.qty += qty;
                        cartItem.total_price = price * cartItem.qty;
                        cartItem.product_image = image_url;

                        await cartItem.save();

                        // console.log("CartItem updated:", {
                        //     id: cartItem.id,
                        //     qty: cartItem.qty,
                        //     total_price: cartItem.total_price
                        // });

                        return cartItem;
                    } else {
                        // console.log("[Create CartItem]:", id);

                        const total_price = price * qty;

                        const newCartItem = new CartItem({
                            cart_id: cart.id,
                            product_id: id,
                            product_name: product.name,
                            product_image: image_url,
                            qty,
                            price,
                            total_price
                        });

                        const savedItem = await newCartItem.save();

                        // console.log("CartItem created:", {
                        //     id: savedItem.id,
                        //     qty: savedItem.qty,
                        //     total_price: savedItem.total_price
                        // });

                        return savedItem;
                    }
                })
            );
        } else {
            console.warn("listItem is empty or invalid");
        }

        const cartItems = await CartItem.find({ cart_id: cart.id });
        // console.log("Total cart items:", cartItems.length);

        if (cartItems.length > 0) {
            cart.total_item = cartItems.reduce((sum, i) => sum + i.qty, 0);
            cart.total_price = cartItems.reduce(
                (acc, curr) => acc + curr.total_price,
                0
            );

            await cart.save();

            //     console.log("Cart updated:", {
            //         total_item: cart.total_item,
            //         total_price: cart.total_price
            //     });
        }

        // console.log("[addProductToCart] Success");
        res.status(200).send({ message: "Add Product to Cart successfully" });

    } catch (error) {
        console.error("[addProductToCart] Error:", error);
        res.status(500).send({
            message: "An error occurred while processing your request."
        });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        // console.log("[updateCartItem] Start");

        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            //   console.log("[Auth] Failed");
            return res.status(401).send({ message: "Authentication failed" });
        }

        const customer_id = auth.id;
        // console.log("[Customer ID]:", customer_id);

        const cart = await Cart.findOne({ customer_id, is_active: true });
        if (!cart) {
            // console.log("[Cart] Not found");
            return res.status(404).json({ message: "Cart not found" });
        }

        // console.log("[Cart Found]:", cart.id);

        const listItem = req.body.listItem;
        // console.log("[Request listItem]:", listItem);

        if (listItem && Array.isArray(listItem)) {
            await Promise.all(
                listItem.map(async (item) => {
                    const { id, qty } = item;
                    //   console.log("[Processing Item]:", { id, qty });

                    const product = await Product.findById(id);
                    if (!product) {
                        // console.log("[Product Not Found]:", id);
                        return;
                    }

                    //   console.log("🍔 [Product Found]:", product.name);

                    const price = product.price;

                    // Xóa item nếu qty <= 0
                    if (qty <= 0) {
                        // console.log("[Delete CartItem] qty <= 0:", id);
                        await CartItem.findOneAndDelete({
                            cart_id: cart.id,
                            product_id: id
                        });
                        return;
                    }

                    const cartItem = await CartItem.findOne({
                        cart_id: cart.id,
                        product_id: id
                    });

                    if (cartItem) {
                        // console.log("[Update CartItem]:", id);

                        cartItem.qty = qty;
                        cartItem.total_price = price * qty;
                        cartItem.product_image = buildProductImageUrl(product);

                        await cartItem.save();
                        // console.log("[Updated]:", {
                        //   qty: cartItem.qty,
                        //   total_price: cartItem.total_price,
                        //   image: cartItem.product_image
                        // });
                    } else {
                        // console.log("[Create CartItem]:", id);

                        const newCartItem = new CartItem({
                            cart_id: cart.id,
                            product_id: id,
                            product_name: product.name,
                            product_image: buildProductImageUrl(product),
                            qty,
                            price,
                            total_price: price * qty
                        });

                        await newCartItem.save();
                        // console.log("[Created CartItem]:", newCartItem._id);
                    }
                })
            );

            // 🔄 Recalculate cart
            const listCartItems = await CartItem.find({ cart_id: cart.id });

            cart.total_item = listCartItems.reduce((sum, i) => sum + i.qty, 0);
            cart.total_price = listCartItems.reduce(
                (acc, curr) => acc + curr.total_price,
                0
            );

            await cart.save();

            //   console.log("[Cart Updated]:", {
            //     total_item: cart.total_item,
            //     total_price: cart.total_price
            //   });
        } else {
            //   console.log("[listItem] Invalid or empty");
        }

        // console.log("[updateCartItem] Done");
        res.status(200).send({ message: "Updated Cart successfully" });
    } catch (error) {
        console.error("[updateCartItem] Error:", error);
        res.status(500).send({
            message: "An error occurred while processing your request."
        });
    }
};

exports.getCart = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        const { id: customer_id } = auth;

        const cart = await Cart.findOne({ customer_id, is_active: true });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const cartItems = await CartItem.find({ cart_id: cart._id });

        res.status(200).json({ cart, cartItems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.deleteCartItem = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        const { id: customer_id } = auth;
        const cart = await Cart.findOne({ customer_id, is_active: true });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const cartItemId = (req.params.id === 'null' ? undefined : req.params.id);

        const cartItem = await CartItem.findOneAndDelete({ _id: cartItemId, cart_id: cart.id });

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        const listCartItems = await CartItem.find({ cart_id: cart.id })
        cart.total_item = listCartItems.reduce((sum, i) => sum + i.qty, 0);
        cart.total_price = listCartItems.reduce((acc, curr) => acc + curr.total_price, 0);
        await cart.save();

        res.status(200).json({ message: "Cart item deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.validateCart = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const userId = req.user.id; // ✅ lấy từ token
        const cart = await Cart.findOne({ user_id: userId });

        return res.json(result);

    } catch (err) {
        console.error("❌ Lỗi validateCart:", err);
        res.status(500).json({ message: err.message });
    }
};