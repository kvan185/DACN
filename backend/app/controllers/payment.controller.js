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
                const order = await Order.findById(orderId);
                if (order && order.order_source === 'table') {
                    await Order.updateMany(
                        { table_number: order.table_number, order_source: 'table', is_payment: false },
                        { $set: { is_payment: true, payment_method: "chuyển khoản" } }
                    );
                } else if (order) {
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

            const order = await Order.findById(orderId);
            if (order) {
                if (responseCode === '00') {
                    if (order.order_source === 'table') {
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