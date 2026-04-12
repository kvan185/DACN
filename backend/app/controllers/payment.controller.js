const db = require("../models");
const convertHelper = require("../helpers/convert.helper.js");
const listSocket = require("../socket");
const Order = db.order;
const OrderItem = db.orderItem;
const CartItem = db.cartItem;
const Admin = db.admin;
const { canDeductIngredients, deductIngredients } = require("./order.controller");
const mongoose = require("mongoose");
const { PayOS } = require("@payos/node");

const client_id = process.env.PAYOS_CLIENT_ID || "";
const api_key = process.env.PAYOS_API_KEY || "";
const checksum_key = process.env.PAYOS_CHECKSUM_KEY || "";

const payos = new PayOS(client_id, api_key, checksum_key);

exports.splitBill = async (req, res) => {
    try {
        const { orderId, splitType, data } = req.body;
        if (!orderId || !data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: "Thiếu dữ liệu split hoặc định dạng sai." });
        }

        let order;
        if (typeof orderId === 'string' && orderId.startsWith("TABLE_")) {
            const tableNum = orderId.split("_")[1];
            const orders = await Order.find({ table_number: tableNum, order_source: 'table', is_payment: false });
            if (!orders || orders.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn chưa thanh toán cho bàn này." });
            
            order = orders[0];
            if (orders.length > 1) {
                // Merge subsequent orders into the first order
                for (let i = 1; i < orders.length; i++) {
                    order.total_price += orders[i].total_price;
                    order.total_item += orders[i].total_item;
                    await OrderItem.updateMany({ order_id: orders[i]._id }, { $set: { order_id: order._id } });
                    await Order.findByIdAndDelete(orders[i]._id);
                }
                await order.save();
            }
        } else {
            order = await Order.findById(orderId);
            if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy Order." });
        }

        if (order.is_payment) return res.status(400).json({ success: false, message: "Order đã thanh toán hoàn toàn." });

        let totalAmount = 0;
        data.forEach(d => {
            if (d && typeof d.amount === 'number') {
                totalAmount += d.amount;
            }
        });

        if (Math.abs(totalAmount - order.total_price) > 10) {
            return res.status(400).json({ success: false, message: "Tổng tiền chia bill không khớp với tổng đơn hàng!" });
        }

        const splits = data.map(d => ({
            split_id: crypto.randomBytes(8).toString('hex'),
            split_type: splitType || 'custom',
            user_name: d.user || "Khách",
            items: Array.isArray(d.items) ? d.items : [],
            percent: parseFloat(d.percent) || 0,
            amount: parseInt(d.amount) || 0,
            is_payment: false,
            payment_method: '',
        }));

        order.split_bills = splits;
        await order.save();

        res.status(200).json({ success: true, message: "Chia bill thành công", splits: order.split_bills });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi process chia bill" });
    }
};

exports.createSplitPaymentUrl = async (req, res) => {
    try {
        const { orderId, splitId, bankCode, method } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const split = order.split_bills.find(s => s.split_id === splitId);
        if (!split) return res.status(404).json({ success: false, message: "Split bill not found" });
        if (split.is_payment) return res.status(400).json({ success: false, message: "Phần này đã được thanh toán" });

        if (method === 'cash' || method === 'manual_transfer') {
            split.is_payment = true;
            split.payment_method = method === 'cash' ? 'tiền mặt' : 'chuyển khoản';
            split.paid_at = new Date();
            
            // Check if all are paid
            const allPaid = order.split_bills.every(s => s.is_payment);
            if (allPaid) {
                order.is_payment = true;
                order.payment_method = 'chia bill';
            }
            await order.save();

            const listOrder = await Order.find({});
            const admins = await Admin.find({});
            for (const ad of admins) {
                if (ad.socket_id) {
                    listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
                }
            }
            return res.status(200).json({ success: true, message: "Thanh toán split (tiền mặt) thành công" });
        }

        // PAYOS
        const payosOrderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));
        split.payos_order_code = payosOrderCode;
        await order.save();

        const body = {
            orderCode: payosOrderCode,
            amount: split.amount,
            description: `Split bill ${split.split_id.slice(-6)}`,
            returnUrl: `http://localhost:5173/checkout`,
            cancelUrl: `http://localhost:5173/checkout`,
        };

        const paymentLinkResponse = await payos.paymentRequests.create(body);
        res.status(200).json({ paymentUrl: paymentLinkResponse.checkoutUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create split payment URL' });
    }
};


exports.createPaymentUrl = async (req, res) => {
    try {
        if (!req.body.cartId) {
            return res.status(400).send({ message: "Not cart id" });
        }
        const { cartId, bankCode, selectedItemIds } = req.body;

        // Kiểm tra tồn kho trước khi tạo đơn và thanh toán
        const cartItems = await CartItem.find({ cart_id: cartId });
        const itemsToCheck = selectedItemIds && selectedItemIds.length > 0 
            ? cartItems.filter(i => selectedItemIds.includes(i.id)) 
            : cartItems;

        const check = await canDeductIngredients(itemsToCheck);
        if (!check.success) {
            return res.status(400).send({ success: false, message: check.message });
        }

        const order = await convertHelper.convertCartToOrder(cartId, "transfer", selectedItemIds);
        await deductIngredients(order.id);
        const oId = order.id;



        const payosOrderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));
        order.payos_order_code = payosOrderCode;
        await order.save();

        const body = {
            orderCode: payosOrderCode,
            amount: order.total_price,
            description: `Thanh toan ${order.id.slice(-6)}`,
            returnUrl: `http://localhost:5173/checkout`,
            cancelUrl: `http://localhost:5173/checkout`,
        };

        const paymentLinkResponse = await payos.paymentRequests.create(body);
        res.status(200).json({ paymentUrl: paymentLinkResponse.checkoutUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create payment URL' });
    }
};

exports.createGuestPaymentUrl = async (req, res) => {
    try {
        const { items, tableNumber, orderSource, bankCode } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).send({ message: "No items provided." });
        }
        
        // Kiểm tra tồn kho trước khi tạo đơn và thanh toán
        const check = await canDeductIngredients(items);
        if (!check.success) {
            return res.status(400).send({ message: check.message });
        }

        const order = await convertHelper.createOrderFromGuestItems(items, "transfer", tableNumber);
        await deductIngredients(order.id);
        const oId = order.id;

        const payosOrderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));
        order.payos_order_code = payosOrderCode;
        await order.save();

        const body = {
            orderCode: payosOrderCode,
            amount: order.total_price,
            description: `Ban ${tableNumber}`,
            returnUrl: `http://localhost:5173/checkout`,
            cancelUrl: `http://localhost:5173/checkout`,
        };

        const paymentLinkResponse = await payos.paymentRequests.create(body);
        res.status(200).json({ paymentUrl: paymentLinkResponse.checkoutUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create guest payment URL' });
    }
};

exports.createTablePaymentUrl = async (req, res) => {
    try {
        const { tableNumber, bankCode } = req.body;
        if (!tableNumber) {
            return res.status(400).send({ message: "No table number provided." });
        }

        const orders = await Order.find({ 
            table_number: tableNumber, 
            order_source: 'table',
            is_payment: false 
        });

        if (orders.length === 0) {
            return res.status(404).send({ message: "No unpaid orders found for this table." });
        }

        const totalAmount = orders.reduce((sum, order) => sum + order.total_price, 0);
        const firstOrderId = orders[0]._id;

        const payosOrderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));
        orders[0].payos_order_code = payosOrderCode;
        await orders[0].save();

        const body = {
            orderCode: payosOrderCode,
            amount: totalAmount,
            description: `Gop Ban ${tableNumber}`,
            returnUrl: `http://localhost:5173/checkout`,
            cancelUrl: `http://localhost:5173/checkout`,
        };

        const paymentLinkResponse = await payos.paymentRequests.create(body);
        res.status(200).json({ paymentUrl: paymentLinkResponse.checkoutUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create table payment URL' });
    }
};

exports.receiveWebhook = async (req, res) => {
    try {
        const webhookData = payos.webhooks.verify(req.body);

        if (webhookData.code === '00') {
            const { orderCode } = webhookData;

            // Tìm đơn hàng chính
            const order = await Order.findOne({ payos_order_code: orderCode });
            if (order) {
                // Đóng dấu toàn bộ order
                if (order.order_source === 'table') {
                    await Order.updateMany(
                        { table_number: order.table_number, order_source: 'table', is_payment: false },
                        { $set: { is_payment: true, payment_method: "chuyển khoản (PayOS)" } }
                    );
                } else {
                    order.is_payment = true;
                    order.payment_method = "chuyển khoản (PayOS)";
                    await order.save();
                }

                // Gửi socket update list
                const listOrder = await Order.find({});
                const admins = await Admin.find({});
                for (const ad of admins) {
                    if (ad.socket_id) {
                        listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
                    }
                }
            } else {
                // Trường hợp thanh toán Split Bill
                // Xử lý các order mà có chứa split_bills với payos_order_code này
                const splitOrder = await Order.findOne({ "split_bills.payos_order_code": orderCode });
                if (splitOrder) {
                    const split = splitOrder.split_bills.find(s => s.payos_order_code === orderCode);
                    if (split && !split.is_payment) {
                        split.is_payment = true;
                        split.payment_method = 'chuyển khoản (PayOS)';
                        split.paid_at = new Date();
                    }
                    const allPaid = splitOrder.split_bills.every(s => s.is_payment);
                    if (allPaid) {
                        splitOrder.is_payment = true;
                        splitOrder.payment_method = 'chia bill (PayOS)';
                    }
                    await splitOrder.save();

                    // Gửi socket
                    const listOrder = await Order.find({});
                    const admins = await Admin.find({});
                    for (const ad of admins) {
                        if (ad.socket_id) {
                            listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
                        }
                    }
                }
            }
        }
        res.status(200).json({ success: true, message: "Webhook accepted" });
    } catch (error) {
        console.error("Webhook error: ", error);
        res.status(400).json({ success: false, message: "Invalid signature" });
    }
};

exports.getOrderStatus = async (req, res) => {
    try {
        const { payosOrderCode } = req.params;
        if (!payosOrderCode) return res.status(400).json({ success: false, message: "Thiếu orderCode" });

        const paymentData = await payos.paymentRequests.get(Number(payosOrderCode));
        res.status(200).json({ success: true, data: paymentData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Call PayOS" });
    }
};