const db = require("../models");
const Order = db.order;
const OrderItem = db.orderItem;
const Customer = db.customer;
const Admin = db.admin;
const ProductBOM = require("../models/productBom.model");
const Ingredient = db.ingredient;
const Product = db.product;
const convertHelper = require("../helpers/convert.helper");

const createCashOrder = async (cartId, tableNumber) => {
    if (!cartId) {
        throw { status: 400, message: "No cart ID provided." };
    }

    const order = await convertHelper.convertCartToOrder(cartId, "cash");

    if (tableNumber) {
        order.table_number = tableNumber;
        order.order_source = "table";
    }

    await order.save();
    return order;
};

const getListOrder = async (auth) => {
    let orders =
        auth.role === "user"
            ? await Order.find({ customer_id: auth.id })
            : await Order.find({});

    orders.sort((a, b) => b.created_at - a.created_at);

    if (auth.role === "user") {
        return await Promise.all(
            orders.map(async (order) => {
                const orderItems = await OrderItem.find({ order_id: order.id });
                return { order, orderItems };
            })
        );
    }

    return orders;
};

const getOrder = async (orderId) => {
    if (!orderId) {
        throw { status: 400, message: "No order ID provided." };
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw { status: 404, message: "Order not found" };
    }

    const orderItems = await OrderItem.find({ order_id: orderId });

    return { order, orderItems };
};

const updateStatusOrder = async (orderId, status) => {
    if (!orderId || !status) {
        throw { status: 400, message: "Missing data." };
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw { status: 404, message: "Order not found" };
    }

    if (
        status === "canceled" &&
        (order.status === "processing" || order.status === "COMPLETED")
    ) {
        throw { status: 400, message: "Can't cancel." };
    }

    // Nếu hoàn thành → trừ nguyên liệu
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
                        is_active: false,
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

    return order;
};

const emitOrderUpdate = async (order) => {
    const UpdateOrder = global._io?.updateOrder;

    const customer = await Customer.findById(order.customer_id);
    const listOrder = await Order.find({});
    const admins = await Admin.find({});

    for (const ad of admins) {
        if (UpdateOrder && ad.socket_id) {
            UpdateOrder.to(ad.socket_id).emit("sendListOrder", listOrder);
        }
    }

    if (UpdateOrder && customer?.socket_id) {
        UpdateOrder.to(customer.socket_id).emit("sendStatusOrder", order);
    }
};

const updateIsPayment = async (orderId, isPayment) => {
    const order = await Order.findById(orderId);

    if (!order) {
        throw { status: 404, message: "Order not found" };
    }

    order.is_payment = isPayment;
    await order.save();

    return order;
};

module.exports = {
    createCashOrder,
    getListOrder,
    getOrder,
    updateStatusOrder,
    updateIsPayment,
    emitOrderUpdate,
};