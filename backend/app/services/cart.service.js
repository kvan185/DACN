const db = require("../models");
const Product = db.product;
const Cart = db.cart;
const CartItem = db.cartItem;

const findCategoryFolder = require("../helpers/findCategoryFolder");
const slugifyVietnamese = require("../helpers/slugifyVietnamese");

const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "../../static/images");

// ===== HELPER =====
const buildProductImageUrl = (product) => {
    if (!product) return null;

    const folder = findCategoryFolder(product.category_id);
    const slugName = slugifyVietnamese(product.name);

    if (!folder || !slugName) return null;

    const exts = [".jpg", ".jpeg", ".png", ".webp"];

    for (const ext of exts) {
        const filePath = path.join(BASE_DIR, folder, `${slugName}${ext}`);
        if (fs.existsSync(filePath)) {
            return `/static/images/${folder}/${slugName}${ext}`;
        }
    }

    return null;
};

// ===== SERVICE =====

exports.initOrRetrieveCart = async (customer_id) => {
    let cart = await Cart.findOne({ customer_id, is_active: true });

    if (!cart) {
        cart = await new Cart({
            customer_id,
            total_item: 0,
            total_price: 0,
            is_active: true,
        }).save();

        return { message: "New cart created", cart };
    }

    return { message: "Cart retrieved successfully", cart };
};

exports.addProductToCart = async (customer_id, listItem) => {
    const cart = await Cart.findOne({ customer_id, is_active: true });
    if (!cart) throw { status: 404, message: "Cart not found" };

    if (listItem && Array.isArray(listItem)) {
        await Promise.all(
            listItem.map(async ({ id, qty }) => {
                if (qty <= 0) return;

                const product = await Product.findById(id);
                if (!product) return;

                const price = product.price;
                const image_url = buildProductImageUrl(product);

                const cartItem = await CartItem.findOne({
                    cart_id: cart.id,
                    product_id: id,
                });

                if (cartItem) {
                    cartItem.qty += qty;
                    cartItem.total_price = price * cartItem.qty;
                    cartItem.product_image = image_url;
                    await cartItem.save();
                } else {
                    await CartItem.create({
                        cart_id: cart.id,
                        product_id: id,
                        product_name: product.name,
                        product_image: image_url,
                        qty,
                        price,
                        total_price: price * qty,
                    });
                }
            })
        );
    }

    await recalcCart(cart);
};

exports.updateCartItem = async (customer_id, listItem) => {
    const cart = await Cart.findOne({ customer_id, is_active: true });
    if (!cart) throw { status: 404, message: "Cart not found" };

    if (listItem && Array.isArray(listItem)) {
        await Promise.all(
            listItem.map(async ({ id, qty }) => {
                const product = await Product.findById(id);
                if (!product) return;

                if (qty <= 0) {
                    await CartItem.findOneAndDelete({
                        cart_id: cart.id,
                        product_id: id,
                    });
                    return;
                }

                const price = product.price;

                const cartItem = await CartItem.findOne({
                    cart_id: cart.id,
                    product_id: id,
                });

                if (cartItem) {
                    cartItem.qty = qty;
                    cartItem.total_price = price * qty;
                    cartItem.product_image = buildProductImageUrl(product);
                    await cartItem.save();
                } else {
                    await CartItem.create({
                        cart_id: cart.id,
                        product_id: id,
                        product_name: product.name,
                        product_image: buildProductImageUrl(product),
                        qty,
                        price,
                        total_price: price * qty,
                    });
                }
            })
        );
    }

    await recalcCart(cart);
};

exports.getCart = async (customer_id) => {
    const cart = await Cart.findOne({ customer_id, is_active: true });
    if (!cart) throw { status: 404, message: "Cart not found" };

    const cartItems = await CartItem.find({ cart_id: cart._id });

    return { cart, cartItems };
};

exports.deleteCartItem = async (customer_id, cartItemId) => {
    const cart = await Cart.findOne({ customer_id, is_active: true });
    if (!cart) throw { status: 404, message: "Cart not found" };

    const deleted = await CartItem.findOneAndDelete({
        _id: cartItemId,
        cart_id: cart.id,
    });

    if (!deleted) {
        throw { status: 404, message: "Cart item not found" };
    }

    await recalcCart(cart);
};

const recalcCart = async (cart) => {
    const items = await CartItem.find({ cart_id: cart.id });

    cart.total_item = items.reduce((sum, i) => sum + i.qty, 0);
    cart.total_price = items.reduce((sum, i) => sum + i.total_price, 0);

    await cart.save();
};