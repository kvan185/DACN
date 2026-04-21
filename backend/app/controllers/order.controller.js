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
const { refreshTableSession } = require("./table.controller");

/**
 * Helper function to check if ingredients are sufficient
 */
async function canDeductIngredients(orderItems) {
    const productIds = orderItems.map(item => new mongoose.Types.ObjectId(item.product_id || item.id));
    const allBoms = await ProductBOM.find({ product_id: { $in: productIds } });
    const ingredientIds = allBoms.map(bom => bom.ingredient_id);
    const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } });
    const ingredientMap = new Map(ingredients.map(ing => [ing._id.toString(), ing]));

    const requiredQtyMap = {};
    for (const item of orderItems) {
        const pidStr = (item.product_id || item.id).toString();
        const boms = allBoms.filter(b => b.product_id.toString() === pidStr);
        for (const bom of boms) {
            const ingIdStr = bom.ingredient_id.toString();
            if (!requiredQtyMap[ingIdStr]) requiredQtyMap[ingIdStr] = 0;
            requiredQtyMap[ingIdStr] += bom.quantity * item.qty;
        }
    }

    for (const [ingIdStr, requiredQty] of Object.entries(requiredQtyMap)) {
        const ingredient = ingredientMap.get(ingIdStr);
        if (!ingredient || ingredient.qty < requiredQty) {
            return { success: false, message: `Nguyên liệu ${ingredient ? ingredient.name : 'không xác định'} không đủ.` };
        }
    }
    return { success: true };
}

async function deductIngredients(orderId) {
    const orderItems = await OrderItem.find({ order_id: orderId });
    const productIds = orderItems.map(item => new mongoose.Types.ObjectId(item.product_id));
    const allBoms = await ProductBOM.find({ product_id: { $in: productIds } });

    const requiredQtyMap = {};
    for (const item of orderItems) {
        const pidStr = item.product_id.toString();
        const boms = allBoms.filter(b => b.product_id.toString() === pidStr);
        for (const bom of boms) {
            const ingIdStr = bom.ingredient_id.toString();
            if (!requiredQtyMap[ingIdStr]) requiredQtyMap[ingIdStr] = 0;
            requiredQtyMap[ingIdStr] += bom.quantity * item.qty;
        }
    }

    const updates = Object.entries(requiredQtyMap).map(([ingId, qty]) => ({
        updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(ingId) },
            update: { $inc: { qty: -qty } }
        }
    }));
    if (updates.length > 0) await Ingredient.bulkWrite(updates);

    // Quét và cập nhật trạng thái cho TOÀN BỘ sản phẩm trong hệ thống để đảm bảo đồng bộ 100%
    await checkAllProductsAvailability();
}

/**
 * Helper function to restore ingredients when order is canceled
 */
async function restoreIngredients(orderId) {
    const orderItems = await OrderItem.find({ order_id: orderId });
    const productIds = orderItems.map(item => new mongoose.Types.ObjectId(item.product_id));
    const allBoms = await ProductBOM.find({ product_id: { $in: productIds } });

    const requiredQtyMap = {};
    for (const item of orderItems) {
        const pidStr = item.product_id.toString();
        const boms = allBoms.filter(b => b.product_id.toString() === pidStr);
        for (const bom of boms) {
            const ingIdStr = bom.ingredient_id.toString();
            if (!requiredQtyMap[ingIdStr]) requiredQtyMap[ingIdStr] = 0;
            requiredQtyMap[ingIdStr] += bom.quantity * item.qty;
        }
    }

    const updates = Object.entries(requiredQtyMap).map(([ingId, qty]) => ({
        updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(ingId) },
            update: { $inc: { qty: qty } }
        }
    }));
    if (updates.length > 0) await Ingredient.bulkWrite(updates);

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

        if (listSocket.io) {
            const activeOrders = await Order.find({ status: { $ne: 'COMPLETED' }, is_payment: false });
            const admins = await Admin.find({ socket_id: { $exists: true, $ne: null } });

            const messageStr = typeOrder === 'chia bill'
                ? `Khách yêu cầu chia bill mới!`
                : (tableNumber ? `Có đơn hàng mới từ bàn ${tableNumber}!` : `Có đơn hàng online mới!`);

            for (const ad of admins) {
                listSocket.updateOrder.to(ad.socket_id).emit('notification', {
                    message: messageStr,
                    time: "Vừa xong",
                    tableNumber: tableNumber,
                    orderId: order.id,
                    batchNum: 1,
                    type: "order",
                    status: 'NEW',
                    createdAt: order.createdAt
                });
                listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', activeOrders);
            }
        }

        res.status(200).send({ success: true, message: "Order created successfully.", order });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while processing your request." });
    }
};

exports.createGuestOrder = async (req, res) => {
    try {
        let { items, tableNumber, typeOrder, guest_name, session_id, phone } = req.body;
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

        let order;
        // Kiểm tra xem khách này đã có order chưa thanh toán ở bàn này chưa
        if (session_id) {
            order = await Order.findOne({
                session_id: session_id,
                table_number: tableNumber,
                is_payment: false,
                status: { $ne: 'COMPLETED' }
            });
        }

        // Nếu k tìm thấy bằng session_id, thử tìm bằng guest_name + tableNumber
        if (!order && guest_name) {
            order = await Order.findOne({
                guest_name: guest_name,
                table_number: tableNumber,
                is_payment: false,
                status: { $ne: 'COMPLETED' }
            });
        }

        let batch_num = 1;

        if (order) {
            // Ensure session_id and guest_name are updated if they were missing
            if (!order.session_id && session_id) order.session_id = session_id;
            if (!order.guest_name && guest_name) order.guest_name = guest_name;
            if (!order.phone && phone) order.phone = phone;

            // Append items to existing order
            const existingItems = await OrderItem.find({ order_id: order._id }).sort({ batch_num: -1 });
            if (existingItems.length > 0) {
                batch_num = existingItems[0].batch_num + 1;
            }

            let addTotal = 0;
            let addItemQty = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const _product = await db.product.findById(item.product_id || item.id);
                if (_product) {
                    const price = item.price || (_product.discount || _product.price);
                    addTotal += price * item.qty;
                    addItemQty += item.qty;

                    const newOrderItem = new OrderItem({
                        order_id: order._id,
                        product_id: _product._id,
                        product_name: _product.name,
                        product_image: _product.image,
                        qty: item.qty,
                        price: price,
                        total_price: price * item.qty,
                        batch_num: batch_num,
                        status: 'NEW'
                    });
                    await newOrderItem.save();
                }
            }
            order.total_price += addTotal;
            order.total_item += addItemQty;
            await order.save();
        } else {
            // Create new order
            order = await convertHelper.createOrderFromGuestItems(items, typeOrder, tableNumber, guest_name, phone);
            if (order) {
                order.session_id = session_id;
                await order.save();
                // set batch_num and status for the newly created items
                await OrderItem.updateMany({ order_id: order._id }, { $set: { batch_num: 1, status: 'NEW' } });
            }
        }

        if (!order) {
            return res.status(500).send({ success: false, message: "Failed to create order." });
        }

        await deductIngredients(order.id);

        if (listSocket.io) {
            const activeOrders = await Order.find({ status: { $ne: 'COMPLETED' }, is_payment: false });
            const admins = await Admin.find({ socket_id: { $exists: true, $ne: null } });

            const messageStr = typeOrder === 'chia bill'
                ? `Khách yêu cầu chia bill mới!`
                : (tableNumber ? `Đơn đặt món mới BÀN ${tableNumber}!` : `Có đơn đặt món khách ẩn danh mới!`);

            for (const ad of admins) {
                listSocket.updateOrder.to(ad.socket_id).emit('notification', {
                    message: messageStr,
                    time: "Vừa xong",
                    tableNumber: tableNumber,
                    guestName: order.guest_name,
                    orderId: order.id,
                    batchNum: batch_num,
                    type: "order",
                    status: 'NEW',
                    createdAt: order.createdAt
                });
                listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', activeOrders);
            }
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
        const { search, isPayment, minPrice, maxPrice, guestName, tableNumber, sortBy, order } = req.query;

        if (guestName && tableNumber) {
            query = {
                ...query,
                guest_name: guestName,
                table_number: tableNumber
            };
        }

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            query.$or = [
                { guest_name: searchRegex },
                { type_payment: searchRegex }
            ];
            // Search by Order ID if valid ObjectId
            if (search.match(/^[0-9a-fA-F]{24}$/)) {
                query.$or.push({ _id: search });
            }
            // Search by total items if numeric
            if (!isNaN(search) && search.trim() !== '') {
                query.$or.push({ total_item: Number(search) });
            }
        }

        if (isPayment !== undefined && isPayment !== 'All') {
            query.is_payment = isPayment === 'true';
        }

        const cleanNum = (val) => (val !== undefined && val !== null) ? String(val).replace(/[^0-9]/g, '') : "";
        const minNum = cleanNum(minPrice);
        const maxNum = cleanNum(maxPrice);

        if (minNum !== "" || maxNum !== "") {
            query.total_price = {};
            if (minNum !== "") query.total_price.$gte = Number(minNum);
            if (maxNum !== "") query.total_price.$lte = Number(maxNum);
        }

        let sort = { created_at: -1 };
        if (sortBy && order) {
            sort = { [sortBy]: order === 'asc' ? 1 : -1 };
        }

        var orders = await Order.find(query).sort(sort);

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
            const ordersWithPending = await Promise.all(orders.map(async (o) => {
                const pendingItems = await OrderItem.countDocuments({
                    order_id: o._id,
                    status: { $in: ['NEW', 'PREPARING'] }
                });
                const obj = o.toObject();
                obj.id = o._id;
                obj.hasPendingItems = pendingItems > 0;
                return obj;
            }));
            res.status(200).json(ordersWithPending);
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
        const listOrder = await Order.find({ status: { $ne: 'COMPLETED' }, is_payment: false });
        const admin = await Admin.find({ socket_id: { $exists: true, $ne: null } });
        for (const ad of admin) {
            listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
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

        const { sessionId } = req.query;

        const Table = db.table;
        const table = await Table.findOne({ tableNumber: tableNumber });
        if (!table) {
            return res.status(404).json({ success: false, message: "Bàn không tồn tại." });
        }

        // We can optionally verify the session here if needed, 
        // but for now we focus on the Join flow which requires the PIN.

        let query = {
            table_number: tableNumber,
            order_source: 'table',
            is_payment: false
        };

        if (sessionId) {
            query.session_id = sessionId;
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });

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
        const { paymentMethod, sessionId } = req.body;
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

        let query = { table_number: tableNumber, order_source: 'table', is_payment: false };
        if (sessionId) {
            query.session_id = sessionId;
        }

        const result = await Order.updateMany(
            query,
            { $set: updateData }
        );

        if (result.matchedCount === 0 && result.modifiedCount === 0) {
            return res.status(404).send({ success: false, message: "No unpaid orders found for this table." });
        }

        const listOrder = await Order.find({ status: { $ne: 'COMPLETED' }, is_payment: false });
        const admin = await Admin.find({ socket_id: { $exists: true, $ne: null } });
        for (const ad of admin) {
            if (paymentMethod === "tiền mặt") {
                listSocket.updateOrder.to(ad.socket_id).emit('notification', {
                    message: `Bàn ${tableNumber} yêu cầu thu bằng tiền mặt tổng đơn!`,
                    time: "Vừa xong",
                    tableNumber: tableNumber,
                    type: "warning"
                });
            }
            listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
        }

        res.status(200).send({ success: true, message: "Guest orders updated with payment method." });

        // Refresh session if all orders are paid - DISABLED automatic refresh
        /*
        if (updateData.is_payment) {
            const unpaidCount = await Order.countDocuments({ 
                table_number: tableNumber, 
                order_source: 'table', 
                is_payment: false 
            });
            if (unpaidCount === 0) {
                await refreshTableSession(tableNumber);
            }
        }
        */
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

        if (isPayment && order.order_source === 'table') {
            // DISABLED automatic refresh on single order payment
            /*
            const unpaidCount = await Order.countDocuments({ 
                table_number: order.table_number, 
                order_source: 'table', 
                is_payment: false 
            });
            if (unpaidCount === 0) {
                await refreshTableSession(order.table_number);
            }
            */
        }

        // Gửi socket update list cho admin
        const listOrder = await Order.find({ status: { $ne: 'COMPLETED' }, is_payment: false });
        const admin = await Admin.find({ socket_id: { $exists: true, $ne: null } });
        for (const ad of admin) {
            listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
        }

        res.status(200).json({ success: true, message: "Cập nhật thanh toán thành công!" });

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
                    message: message || `Bàn số ${tableNumber} yêu cầu hỗ trợ thanh toán!`,
                    time: "Vừa xong",
                    tableNumber,
                    orderId,
                    type: "support",
                    createdAt: new Date()
                });
            }
        }

        // Cập nhật trạng thái yêu cầu hỗ trợ vào database
        if (orderId) {
            await Order.findByIdAndUpdate(orderId, { needs_support: true });
        }

        res.status(200).json({ success: true, message: "Đã gửi yêu cầu hỗ trợ tới nhân viên." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi gửi yêu cầu hỗ trợ." });
    }
};

exports.getActiveGuests = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        const orders = await Order.find({ table_number: tableNumber, is_payment: false, status: { $ne: 'COMPLETED' } });

        const guests = [];
        orders.forEach(o => {
            if (o.guest_name && !guests.includes(o.guest_name)) {
                guests.push(o.guest_name);
            }
        });

        res.status(200).json({ success: true, guests: guests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khách' });
    }
};

exports.resetSupportRequest = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ success: false, message: "Thiếu Order ID" });

        await Order.findByIdAndUpdate(orderId, { needs_support: false });

        // Thông báo socket cho list cập nhật
        const listOrder = await Order.find({ status: { $ne: 'COMPLETED' }, is_payment: false });
        const admins = await Admin.find({ socket_id: { $exists: true, $ne: null } });
        for (const ad of admins) {
            listSocket.updateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
        }

        res.status(200).json({ success: true, message: "Đã xác nhận xử lý yêu cầu." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi xử lý yêu cầu." });
    }
};

exports.joinGuestSession = async (req, res) => {
    try {
        const { tableNumber, username, phoneCode, pin } = req.body;
        if (!phoneCode) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp số điện thoại." });
        }

        // Validate phone number format
        const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
        if (!phoneRegex.test(phoneCode)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại không đúng định dạng (10 chữ số, ví dụ: 0912345678).' });
        }

        const Table = db.table;
        const table = await Table.findOne({ tableNumber: tableNumber });
        if (!table) {
            return res.status(404).json({ success: false, message: "Bàn không tồn tại." });
        }

        if (table.session_pin && table.session_pin !== pin) {
            return res.status(403).json({ success: false, message: "Mã PIN không chính xác. Vui lòng liên hệ nhân viên để lấy mã." });
        }

        // 1. Tìm tên khách hàng gần nhất đã dùng số điện thoại này
        const lastOrderWithPhone = await Order.findOne({ phone: phoneCode }).sort({ createdAt: -1 });
        const suggestedName = lastOrderWithPhone ? lastOrderWithPhone.guest_name : null;

        // 2. Nếu khách chưa nhập tên nhưng ta tìm thấy tên cũ -> Trả về gợi ý
        if (!username && suggestedName) {
            return res.status(200).json({ 
                success: true, 
                needName: false, 
                suggestedName: suggestedName,
                message: "Tìm thấy thông tin cũ của bạn." 
            });
        }

        // 3. Kiểm tra tính xác thực của tên đã chọn (nếu có)
        if (username) {
            const orderByName = await Order.findOne({ 
                table_number: tableNumber, 
                guest_name: username,
                is_payment: false, 
                status: { $ne: 'COMPLETED' } 
            });

            if (orderByName) {
                // Nếu đơn hàng này đã được gắn với một số điện thoại khác -> Yêu cầu xác thực đúng
                if (orderByName.phone && orderByName.phone !== phoneCode) {
                    return res.status(401).json({ 
                        success: false, 
                        message: "Tên này đã được đăng ký bởi một số điện thoại khác. Vui lòng nhập đúng số điện thoại của bạn hoặc chọn tên khác." 
                    });
                }
                
                // Trả về sessionId cũ để khách tiếp tục phiên
                return res.status(200).json({ 
                    success: true, 
                    username: orderByName.guest_name, 
                    code: phoneCode, 
                    sessionId: orderByName.session_id || phoneCode 
                });
            }
        }

        // 4. Kiểm tra xem số điện thoại này đã có phiên ở bàn này chưa (phòng trường hợp khách dùng tên khác nhưng cùng phone)
        const orderByPhone = await Order.findOne({ 
            table_number: tableNumber, 
            phone: phoneCode,
            is_payment: false, 
            status: { $ne: 'COMPLETED' } 
        });

        if (orderByPhone) {
            return res.status(200).json({ 
                success: true, 
                username: orderByPhone.guest_name, 
                code: phoneCode, 
                sessionId: orderByPhone.session_id || phoneCode 
            });
        }

        // 5. Nếu chưa có phiên nào và cũng chưa có username -> Yêu cầu nhập tên
        if (!username) {
            return res.status(200).json({ success: true, needName: true });
        }

        // 6. Khách mới hoàn toàn cho bàn này -> Tạo ID ngẫu nhiên
        const randomId = Math.random().toString(36).substring(2, 8);
        return res.status(200).json({ success: true, username: username, code: phoneCode, sessionId: randomId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi xác thực định danh' });
    }
};

exports.updateOrderItemStatus = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { status } = req.body;

        const item = await OrderItem.findOne({ _id: itemId, order_id: id });
        if (!item) {
            return res.status(404).json({ success: false, message: "Không tìm thấy món trong đơn." });
        }

        if (status === 'CANCELED' && item.status !== 'CANCELED') {
            const Order = db.order;
            const orderDoc = await Order.findById(id);
            if (orderDoc) {
                // Giảm tiền và số lượng của đơn hàng
                orderDoc.total_price = Math.max(0, orderDoc.total_price - item.total_price);
                orderDoc.total_item = Math.max(0, orderDoc.total_item - item.qty);
                await orderDoc.save();
            }
        }

        item.status = status;
        if (status === 'SERVED') {
            item.served_at = new Date();
        } else if (status !== 'SERVED') {
            item.served_at = null;
        }
        await item.save();

        if (listSocket.io) {
            // Calculate batch status
            const batchItems = await OrderItem.find({ order_id: id, batch_num: item.batch_num });
            const nonCanceled = batchItems.filter(i => i.status !== 'CANCELED');

            let batchStatus = 'NEW';
            if (nonCanceled.length > 0) {
                const allServed = nonCanceled.every(i => i.status === 'SERVED');
                const someServed = nonCanceled.some(i => i.status === 'SERVED');
                const anyPreparing = nonCanceled.some(i => ['PROCESSING', 'CONFIRMED', 'PREPARING'].includes(i.status));
                const allNew = nonCanceled.every(i => i.status === 'NEW');

                if (allServed) batchStatus = 'SERVED';
                else if (someServed) batchStatus = 'SERVING';
                else if (anyPreparing) batchStatus = 'CONFIRMED';
                else if (allNew) batchStatus = 'NEW';
                else batchStatus = 'CONFIRMED'; // Fallback
            }

            listSocket.io.emit('itemStatusUpdated', { orderId: id, itemId: itemId, status: status });
            listSocket.io.emit('batchStatusUpdated', { orderId: id, batchNum: item.batch_num, status: batchStatus });
        }

        res.status(200).json({ success: true, message: "Đã cập nhật trạng thái món", item });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi cập nhật món." });
    }
};

exports.mergeOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
            return res.status(400).json({ success: false, message: "Cần truyền ít nhất 2 orderId để gộp." });
        }

        const orders = await Order.find({ _id: { $in: orderIds }, is_payment: false });
        if (orders.length !== orderIds.length) {
            return res.status(400).json({ success: false, message: "Có order không hợp lệ hoặc đã thanh toán." });
        }

        const mainOrder = orders[0];
        let addedPrice = 0;
        let addedItems = 0;
        let guestNames = [mainOrder.guest_name];

        const idsToDelete = [];
        for (let i = 1; i < orders.length; i++) {
            const o = orders[i];
            addedPrice += o.total_price;
            addedItems += o.total_item;
            if (o.guest_name && !guestNames.includes(o.guest_name)) {
                guestNames.push(o.guest_name);
            }
            idsToDelete.push(o._id);

            // Chuyển items sang mainOrder
            await OrderItem.updateMany({ order_id: o._id }, { $set: { order_id: mainOrder._id } });
        }

        mainOrder.total_price += addedPrice;
        mainOrder.total_item += addedItems;
        mainOrder.guest_name = guestNames.join(', ');
        if (!mainOrder.guest_name) mainOrder.guest_name = 'Gộp Bill';
        await mainOrder.save();

        await Order.deleteMany({ _id: { $in: idsToDelete } });

        res.status(200).json({ success: true, message: "Đã gộp đơn hàng", newOrderId: mainOrder._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi gộp đơn hàng." });
    }
};

exports.getOrdersByMultiTables = async (req, res) => {
    try {
        const { tables } = req.query;
        if (!tables) {
            return res.status(400).send({ success: false, message: "Missing tables parameter" });
        }
        
        const tableNumbers = tables.split(',').map(t => t.trim());
        
        // Find active orders for these tables
        const orders = await Order.find({
            table_number: { $in: tableNumbers },
            is_payment: false
        }).sort({ createdAt: -1 });
        
        if (!orders || orders.length === 0) {
            return res.status(404).send({ success: false, message: "Không tìm thấy đơn hàng nào cho các bàn này" });
        }
        
        const orderIds = orders.map(o => o._id);
        const orderItems = await OrderItem.find({ order_id: { $in: orderIds }, is_active: true });
        
        // Calculate totals
        const totalAmount = orders.reduce((sum, o) => sum + o.total_price, 0);
        
        // Group items
        // Format: { productId: { name, totalQty, byTable: { table1: qty1, table2: qty2 } } }
        const groupedMap = {};
        
        for (const item of orderItems) {
            const order = orders.find(o => o._id.toString() === item.order_id.toString());
            if (!order) continue;
            
            const pId = item.product_id ? item.product_id.toString() : (item.id ? item.id.toString() : 'unknown');
            if (!groupedMap[pId]) {
                groupedMap[pId] = {
                    product_id: pId,
                    product_name: item.product_name || 'Không xác định',
                    total_qty: 0,
                    unit_price: item.price,
                    byTable: {}
                };
            }
            
            groupedMap[pId].total_qty += item.qty;
            
            const tNum = order.table_number;
            if (!groupedMap[pId].byTable[tNum]) {
                groupedMap[pId].byTable[tNum] = 0;
            }
            groupedMap[pId].byTable[tNum] += item.qty;
        }
        
        const groupedItems = Object.values(groupedMap);
        
        res.send({
            success: true,
            orders: orders,
            groupedItems: groupedItems,
            totalAmount: totalAmount,
            tableNumbers: tableNumbers
        });
    } catch (err) {
        console.error("Lỗi getOrdersByMultiTables:", err);
        res.status(500).send({ success: false, message: "Lỗi server." });
    }
};
