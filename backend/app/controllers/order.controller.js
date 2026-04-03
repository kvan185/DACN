const middlewares = require("./auth.middlewares");
const db = require("../models");
const Cart = db.cart;
const CartItem = db.cartItem;
const Order = db.order;
const OrderItem = db.orderItem;
const convertHelper = require("../helpers/convert.helper.js");
const listSocket = require("../socket");
const Customer = db.customer;
const Admin = db.admin;
const ProductBOM = require("../models/productBom.model");
const Ingredient = db.ingredient;
const Product = db.product;
const { checkManyProducts } = require("../services/product.service");

exports.createCashOrder = async (req, res) => {
    try {
        const { cartId, tableNumber, selectedItemIds } = req.body;
        if (!cartId) {
            return res.status(400).send({ success: false, message: "No cart ID provided." });
        }
        const order = await convertHelper.convertCartToOrder(cartId, "cash", selectedItemIds);

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

exports.createGuestOrder = async (req, res) => {
    try {
        const { items, tableNumber, typeOrder } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).send({ success: false, message: "No items provided." });
        }
        const order = await convertHelper.createOrderFromGuestItems(items, typeOrder, tableNumber);

        if (!order) {
            return res.status(500).send({ success: false, message: "Failed to create order." });
        }

        res.status(200).send({ success: true, message: "Guest order created successfully.", order });
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

        let query = auth.role == "user" ? { customer_id: auth.id } : {};
        const { search } = req.query;
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            query = {
                ...query,
                $or: [
                    { first_name: searchRegex },
                    { last_name: searchRegex },
                    { phone: searchRegex }
                ]
            };
            if (search.match(/^[0-9a-fA-F]{24}$/)) {
                query.$or.push({ _id: search });
            }
        }
        var orders = await Order.find(query);
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
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }
        if (!req.body.orderId || !req.body.status) {
            return res.status(400).send({ message: "No order ID provided or Status." });
        }

        const order = await Order.findById(req.body.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (req.body.status == "canceled" && (order.status == "processing" || order.status == "completed")) {
            return res.status(400).send({ message: "Can't cancel." });
        }

        if (req.body.status === "COMPLETED") {
            const orderItems = await OrderItem.find({ order_id: req.body.orderId });

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

        order.status = req.body.status;
        await order.save();

        const userId = order.customer_id;

        if (userId) {
            const customer = await Customer.findById(userId);
            if (customer && customer.socket_id) {
                listSocket.updateOrder.to(customer.socket_id).emit('sendStatusOrder', order);
            }
        }
        const listOrder = await Order.find({});
        const admin = await Admin.find({});
        for (const ad of admin ) {
            if (ad.socket_id) {
                listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
            }
        }
        res.status(200).json({ message: "Updated status." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.getGuestOrdersByTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        if (!tableNumber) {
            return res.status(400).send({ success: false, message: "No table number provided." });
        }

        const orders = await Order.find({ 
            table_number: tableNumber, 
            order_source: 'table',
            is_payment: false 
        }).sort({ createdAt: -1 });

        const orderList = await Promise.all(
            orders.map(async (order) => {
                const orderItems = await OrderItem.find({ order_id: order.id });
                return {
                    order,
                    orderItems,
                };
            })
        );
        res.status(200).json(orderList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred while fetching orders." });
    }
};

exports.payGuestOrdersByTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        if (!tableNumber) {
            return res.status(400).send({ success: false, message: "No table number provided." });
        }

        const result = await Order.updateMany(
            { table_number: tableNumber, order_source: 'table', is_payment: false },
            { $set: { is_payment: true } }
        );

        if (result.matchedCount === 0 && result.modifiedCount === 0) {
            return res.status(404).send({ success: false, message: "No unpaid orders found for this table." });
        }

        const listOrder = await Order.find({});
        const admin = await Admin.find({});
        for (const ad of admin) {
            if (ad.socket_id) {
                listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
            }
        }

        res.status(200).send({ success: true, message: "Guest orders marked as paid." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while paying orders." });
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
