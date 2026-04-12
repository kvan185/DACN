const mongoose = require("mongoose");
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
const { checkAllProductsAvailability } = require("../services/product.service");

/**
 * Helper function to check if ingredients are sufficient
 */
async function canDeductIngredients(orderItems) {
    for (const item of orderItems) {
        const productId = item.product_id || item.id;
        const pid = new mongoose.Types.ObjectId(productId);
        const boms = await ProductBOM.find({ product_id: pid });
        for (const bom of boms) {
            const ingredient = await Ingredient.findById(bom.ingredient_id);
            if (!ingredient || ingredient.qty < (bom.quantity * item.qty)) {
                return { success: false, message: `Nguyên liệu cho món ${item.product_name || item.name} không đủ.` };
            }
        }
    }
    return { success: true };
}

async function deductIngredients(orderId) {
    const orderItems = await OrderItem.find({ order_id: orderId });

    for (const item of orderItems) {
        const pid = new mongoose.Types.ObjectId(item.product_id);
        const boms = await ProductBOM.find({ product_id: pid });
        for (const bom of boms) {
            const ingredient = await Ingredient.findById(bom.ingredient_id);
            if (ingredient) {
                ingredient.qty -= (bom.quantity * item.qty);
                await ingredient.save();
            }
        }
    }

    // Quét và cập nhật trạng thái cho TOÀN BỘ sản phẩm trong hệ thống để đảm bảo đồng bộ 100%
    await checkAllProductsAvailability();
}

/**
 * Helper function to restore ingredients when order is canceled
 */
async function restoreIngredients(orderId) {
    const orderItems = await OrderItem.find({ order_id: orderId });

    for (const item of orderItems) {
        const pid = new mongoose.Types.ObjectId(item.product_id);
        const boms = await ProductBOM.find({ product_id: pid });
        for (const bom of boms) {
            const ingredient = await Ingredient.findById(bom.ingredient_id);
            if (ingredient) {
                ingredient.qty += (bom.quantity * item.qty);
                await ingredient.save();
            }
        }
    }

    // Quét và cập nhật trạng thái cho TOÀN BỘ sản phẩm trong hệ thống để đảm bảo đồng bộ 100%
    await checkAllProductsAvailability();
}

exports.deductIngredients = deductIngredients;
exports.restoreIngredients = restoreIngredients;
exports.canDeductIngredients = canDeductIngredients;

exports.createCashOrder = async (req, res) => {
    try {
        let { cartId, tableNumber, selectedItemIds, typeOrder } = req.body;
        if (!cartId) {
            return res.status(400).send({ success: false, message: "No cart ID provided." });
        }

        if (tableNumber) {
            const Table = db.table;
            const tableRecord = await Table.findOne({ tableNumber: tableNumber });
            if (tableRecord && tableRecord.merged_into) {
                tableNumber = tableRecord.merged_into;
            }
        }

        // Kiểm tra tồn kho trước khi tạo đơn
        const cartItems = await CartItem.find({ cart_id: cartId });
        const itemsToCheck = selectedItemIds && selectedItemIds.length > 0
            ? cartItems.filter(i => selectedItemIds.includes(i.id))
            : cartItems;

        const check = await canDeductIngredients(itemsToCheck);
        if (!check.success) {
            return res.status(400).send({ success: false, message: check.message });
        }

        const order = await convertHelper.convertCartToOrder(cartId, typeOrder || "cash", selectedItemIds);

        if (!order) {
            return res.status(500).send({ success: false, message: "Failed to convert cart to order." });
        }

        if (tableNumber) {
            order.table_number = tableNumber;
            order.order_source = "table";
        }
        await order.save();
        await deductIngredients(order.id);
        res.status(200).send({ success: true, message: "Order created successfully.", order });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while processing your request." });
    }
};

exports.createGuestOrder = async (req, res) => {
    try {
        let { items, tableNumber, typeOrder } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).send({ success: false, message: "No items provided." });
        }

        if (tableNumber) {
            const Table = db.table;
            const tableRecord = await Table.findOne({ tableNumber: tableNumber });
            if (tableRecord && tableRecord.merged_into) {
                tableNumber = tableRecord.merged_into;
            }
        }

        // Kiểm tra tồn kho trước khi tạo đơn
        const check = await canDeductIngredients(items);
        if (!check.success) {
            return res.status(400).send({ success: false, message: check.message });
        }

        const order = await convertHelper.createOrderFromGuestItems(items, typeOrder, tableNumber);

        if (!order) {
            return res.status(500).send({ success: false, message: "Failed to create order." });
        }

        await deductIngredients(order.id);

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

        if (req.body.status === "canceled" && order.status === "NEW") {
            // Hoàn lại nguyên liệu nếu đơn hàng bị hủy ở trạng thái mới (chưa xác nhận)
            await restoreIngredients(order.id);
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
        for (const ad of admin) {
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
        const { paymentMethod } = req.body;
        if (!tableNumber) {
            return res.status(400).send({ success: false, message: "No table number provided." });
        }

        const updateData = {
            payment_method: paymentMethod || "tiền mặt"
        };

        // Nếu là chuyển khoản, ta có thể đánh dấu là đã thanh toán luôn 
        // (thường gọi sau khi VNPAY thành công hoặc nhân viên xác nhận)
        if (paymentMethod === "chuyển khoản") {
            updateData.is_payment = true;
        }

        const result = await Order.updateMany(
            { table_number: tableNumber, order_source: 'table', is_payment: false },
            { $set: updateData }
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

        res.status(200).send({ success: true, message: "Guest orders updated with payment method." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while updating orders." });
    }
};

exports.updateIsPayment = async (req, res) => {
    try {
        const { isPayment, orderId, paymentMethod } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.is_payment = isPayment;

        // Cập nhật phương thức thanh toán nếu có hoặc mặc định là tiền mặt
        if (isPayment) {
            if (paymentMethod) {
                order.payment_method = paymentMethod;
            } else if (!order.payment_method) {
                order.payment_method = 'tiền mặt';
            }
        }

        await order.save();

        // Nếu là đơn tại bàn, cập nhật tất cả các đơn chưa thanh toán khác của bàn này
        if (order.order_source === 'table' && isPayment) {
            await Order.updateMany(
                { table_number: order.table_number, order_source: 'table', is_payment: false },
                { $set: { is_payment: true, payment_method: order.payment_method || 'tiền mặt' } }
            );
        }

        // Gửi socket update list cho admin
        const listOrder = await Order.find({});
        const admin = await Admin.find({});
        for (const ad of admin) {
            if (ad.socket_id) {
                listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
            }
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.callStaff = async (req, res) => {
    try {
        const { tableNumber, message, orderId } = req.body;
        
        // Gửi socket cho toàn bộ admin/staff
        const admins = await Admin.find({});
        for (const ad of admins) {
            if (ad.socket_id) {
                listSocket.updateOrder.to(ad.socket_id).emit('notification', {
                    message: message || `Bàn số ${tableNumber} yêu cầu hỗ trợ!`,
                    time: "Vừa xong",
                    tableNumber,
                    orderId
                });
            }
        }

        res.status(200).json({ success: true, message: "Đã gửi yêu cầu hỗ trợ tới nhân viên." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi gửi yêu cầu hỗ trợ." });
    }
};
