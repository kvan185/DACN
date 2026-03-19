const middlewares = require("./auth.middlewares");
const db = require("../models");
const Cart = db.cart;
const CartItem = db.cartItem;
const Order = db.order;
const OrderItem = db.orderItem;
const convertHelper = require("../helpers/convert.helper.js");
const Customer = db.customer;
const Admin = db.admin;
const ProductBOM = require("../models/productBom.model");
const Ingredient = db.ingredient;
const Product = db.product;

exports.createCashOrder = async (req, res) => {
    try {
        const { cartId, tableNumber } = req.body;
        if (!cartId) {
            return res.status(400).send({ success: false, message: "No cart ID provided." });
        }
        const order = await convertHelper.convertCartToOrder(cartId, "cash");

        if (tableNumber) {
            order.table_number = tableNumber;
            order.order_source = "table";
        }
        await order.save();
        res.status(200).send({ success: true, message: "Order created successfully.", order });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while processing your request." });
    }
};

exports.getListOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        var orders = auth.role == "user" ? await Order.find({ customer_id: auth.id }) : await Order.find({});
        orders.sort((a, b) => b.created_at - a.created_at);
        orders.reverse();

        if (auth.role == "user") {
            const orderList = await Promise.all(
                orders.map(async (order) => {
                    const orderItems = await OrderItem.find({ order_id: order.id });
                    const orderWithItems = {
                        order,
                        orderItems,
                    };
                    return orderWithItems;
                })
            );
            res.status(200).json(orderList);
        } else {
            res.status(200).json(orders);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }
        if (!req.params.orderId) {
            return res.status(400).send({ message: "No order ID provided." });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        const orderItems = await OrderItem.find({ order_id: req.params.orderId });
        res.status(200).json({ order, orderItems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};


exports.updateStatusOrder = async (req, res) => {
    try {
        const UpdateOrder = global._io?.updateOrder;
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        const { orderId, status } = req.body;

        if (!orderId || !status) {
            return res.status(400).send({ message: "Missing data." });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (status == "canceled" && (order.status == "processing" || order.status == "COMPLETED")) {
            return res.status(400).send({ message: "Can't cancel." });
        }

        if (status === "COMPLETED") {
            const orderItems = await OrderItem.find({ order_id: orderId });

            for (const item of orderItems) {
                const productId = item.product_id;
                const qtyOrder = item.qty;

                const boms = await ProductBOM.find({ product_id: productId });

                for (const bom of boms) {
                    const ingredient = await Ingredient.findById(bom.ingredient_id);

                    if (!ingredient) continue;

                    const totalNeed = bom.quantity * qtyOrder;

                    if (ingredient.qty < totalNeed) {
                        await Product.findByIdAndUpdate(productId, {
                            is_active: false
                        });
                        continue;
                    }

                    ingredient.qty -= totalNeed;
                    await ingredient.save();
                }
            }
        }

        order.status = status;
        await order.save();

        if (status === "COMPLETED") {
            const orderItems = await OrderItem.find({ order_id: orderId });
        }

        const customer = await Customer.findById(order.customer_id);

        const listOrder = await Order.find({});
        const admins = await Admin.find({});
        for (const ad of admins) {
            if (UpdateOrder && ad.socket_id) {
                UpdateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
            }
        }

        if (UpdateOrder && customer?.socket_id) {
            UpdateOrder.to(customer.socket_id).emit('sendStatusOrder', order);
        }

        res.status(200).json({ message: "Updated status." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateIsPayment = async (req, res) => {
    try {
        const isPayment = req.body.isPayment;
        const orderId = req.body.orderId;
        const order = await Order.findById(orderId);
        order.is_payment = isPayment;
        await order.save();
        res.status(200).json({ order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};
