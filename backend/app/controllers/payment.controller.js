const db = require("../models");
const moment = require('moment');
const crypto = require("crypto");
const convertHelper = require("../helpers/convert.helper.js");
const listSocket = require("../socket");
const Order = db.order;
const OrderItem = db.orderItem;
const CartItem = db.cartItem;
const Admin = db.admin;
const { canDeductIngredients, deductIngredients } = require("./order.controller");
const mongoose = require("mongoose");

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

        if (method === 'cash') {
            split.is_payment = true;
            split.payment_method = 'tiền mặt';
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

        // VNPAY
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
        let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

        let tmnCode = process.env.VNP_TMNCODE;
        let secretKey = process.env.VNP_HASHSECRET;
        let vnpUrl = process.env.VNP_URL;
        let returnUrl = process.env.VNP_RETURNURL;

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        // TxnRef MUST BE UNIQUE -> orderId_splitId
        vnp_Params['vnp_TxnRef'] = orderId + "_" + splitId;
        vnp_Params['vnp_OrderInfo'] = `Thanh toan split bill:${splitId}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = split.amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

        vnp_Params = sortObject(vnp_Params);
        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl })
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

        process.env.TZ = 'Asia/Ho_Chi_Minh';

        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');

        let ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        let tmnCode = process.env.VNP_TMNCODE;
        let secretKey = process.env.VNP_HASHSECRET;
        let vnpUrl = process.env.VNP_URL;
        let returnUrl = process.env.VNP_RETURNURL;
        let orderId = oId;
        let amount = order.total_price;

        let locale = 'vn';
        if (locale === null || locale === '') {
            locale = 'vn';
        }
        let currCode = 'VND';
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);

        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl })
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

        process.env.TZ = 'Asia/Ho_Chi_Minh';

        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');

        let ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        let tmnCode = process.env.VNP_TMNCODE;
        let secretKey = process.env.VNP_HASHSECRET;
        let vnpUrl = process.env.VNP_URL;
        let returnUrl = process.env.VNP_RETURNURL;
        let orderId = oId;
        let amount = order.total_price;

        let locale = 'vn';
        let currCode = 'VND';
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);

        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl })
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

        process.env.TZ = 'Asia/Ho_Chi_Minh';
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
        let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

        let tmnCode = process.env.VNP_TMNCODE;
        let secretKey = process.env.VNP_HASHSECRET;
        let vnpUrl = process.env.VNP_URL;
        let returnUrl = process.env.VNP_RETURNURL;

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = firstOrderId;
        vnp_Params['vnp_OrderInfo'] = `TableOrder:${firstOrderId}:${tableNumber}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = totalAmount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

        vnp_Params = sortObject(vnp_Params);
        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create table payment URL' });
    }
};

exports.vnpayReturn = async (req, res) => {
    try {
        let vnp_Params = req.query;

        let secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);

        let tmnCode = process.env.VNP_TMNCODE;
        let secretKey = process.env.VNP_HASHSECRET;

        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            let orderId = vnp_Params['vnp_TxnRef'];
            let responseCode = vnp_Params['vnp_ResponseCode'];
            
            if (responseCode === '00') {
                let actualOrderId = orderId;
                let splitId = null;
                
                if (orderId.includes('_')) {
                    const parts = orderId.split('_');
                    actualOrderId = parts[0];
                    splitId = parts[1];
                }

                const order = await Order.findById(actualOrderId);
                if (order) {
                    if (splitId) {
                        const split = order.split_bills.find(s => s.split_id === splitId);
                        if (split) {
                            split.is_payment = true;
                            split.payment_method = 'chuyển khoản';
                            split.paid_at = new Date();
                        }
                        const allPaid = order.split_bills.every(s => s.is_payment);
                        if (allPaid) {
                            order.is_payment = true;
                            order.payment_method = 'chuyển khoản (chia bill)';
                        }
                        await order.save();
                    } else if (order.order_source === 'table') {
                        await Order.updateMany(
                            { table_number: order.table_number, order_source: 'table', is_payment: false },
                            { $set: { is_payment: true, payment_method: "chuyển khoản" } }
                        );
                    } else {
                        order.is_payment = true;
                        order.payment_method = "chuyển khoản";
                        await order.save();
                    }
                }
                
                // Gửi socket update list cho admin
                const listOrder = await Order.find({});
                const admins = await Admin.find({});
                for (const ad of admins) {
                    if (ad.socket_id) {
                        listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
                    }
                }
                
                res.status(200).json({ code: '00', message: 'Success' });
            } else {
                res.status(200).json({ code: responseCode, message: 'Payment failed' });
            }
        } else {
            res.status(200).json({ code: '97', message: 'Invalid checksum' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.vnpayIPN = async (req, res) => {
    try {
        let vnp_Params = req.query;
        let secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);
        let secretKey = process.env.VNP_HASHSECRET;
        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            let orderId = vnp_Params['vnp_TxnRef'];
            let responseCode = vnp_Params['vnp_ResponseCode'];

            let actualOrderId = orderId;
            let splitId = null;
            if (orderId.includes('_')) {
                const parts = orderId.split('_');
                actualOrderId = parts[0];
                splitId = parts[1];
            }

            const order = await Order.findById(actualOrderId);
            if (order) {
                if (responseCode === '00') {
                    if (splitId) {
                        const split = order.split_bills.find(s => s.split_id === splitId);
                        if (split && !split.is_payment) {
                            split.is_payment = true;
                            split.payment_method = 'chuyển khoản';
                            split.paid_at = new Date();
                        }
                        const allPaid = order.split_bills.every(s => s.is_payment);
                        if (allPaid) {
                            order.is_payment = true;
                            order.payment_method = 'chuyển khoản (chia bill)';
                        }
                        await order.save();
                    } else if (order.order_source === 'table') {
                        await Order.updateMany(
                            { table_number: order.table_number, order_source: 'table', is_payment: false },
                            { $set: { is_payment: true, payment_method: "chuyển khoản" } }
                        );
                    } else {
                        order.is_payment = true;
                        order.payment_method = "chuyển khoản";
                        await order.save();
                    }

                    // Gửi socket update list cho admin
                    const listOrder = await Order.find({});
                    const admins = await Admin.find({});
                    for (const ad of admins) {
                        if (ad.socket_id) {
                            listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
                        }
                    }

                    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
                } else {
                    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
                }
            } else {
                res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }
        } else {
            res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
        }
    } catch (error) {
        console.error(error);
        res.status(200).json({ RspCode: '99', Message: 'Unknow error' });
    }
};

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}