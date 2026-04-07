const db = require("../models");
const Cart = db.cart;
const CartItem = db.cartItem;
const Order = db.order;
const OrderItem = db.orderItem;
const Customer = db.customer;
const Admin = db.admin;
const listSocket = require("../socket");
const UpdateOrder = listSocket.updateOrder;

exports.convertCartToOrder = async (cartId, typeOrder, selectedItemIds = null) => {
    const cart = await Cart.findById(cartId);
    if (!cart || !cart.is_active) {
        return false;
    }

    const customer = await Customer.findById(cart.customer_id);
    if (!customer) {
        return false;
    }

    let cartItems = await CartItem.find({ cart_id: cartId });
    if (selectedItemIds && selectedItemIds.length > 0) {
        cartItems = cartItems.filter(item => selectedItemIds.includes(item.id));
    }

    const total_item = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const total_price = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    const newOrder = new Order({
        cart_id: cart.id,
        customer_id: cart.customer_id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        email: customer.email,
        total_item: total_item,
        total_price: total_price,
        status: "NEW",
        type_order: typeOrder,
        payment_method: typeOrder === "cash" ? "tiền mặt" : (typeOrder === "transfer" ? "chuyển khoản" : ""),
        is_payment: false,
        is_active: true,
    });
    const saveNewOrder = await newOrder.save();

    const listOrder = await Order.find({});
    const admin = await Admin.find({});
    for (const ad of admin) {
        if (ad.socket_id && UpdateOrder) {
            UpdateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
        }
    }

    await Promise.all(
        cartItems.map(async (item) => {
            const newOrderItem = new OrderItem({
                order_id: saveNewOrder.id,
                product_id: item.product_id,
                product_name: item.product_name,
                product_image: item.product_image,
                qty: item.qty,
                price: item.price,
                total_price: item.total_price,
                is_active: item.is_active,
            });
            await newOrderItem.save();
            await CartItem.findByIdAndDelete(item._id);
        })
    );

    const remainingItems = await CartItem.find({ cart_id: cartId });
    if (remainingItems.length === 0) {
        cart.is_active = false;
        await cart.save();

        const newCart = new Cart({
            customer_id: cart.customer_id,
            total_item: 0,
            total_price: 0,
            is_active: true,
        });
        await newCart.save();
    } else {
        cart.total_item = remainingItems.reduce((sum, item) => sum + item.qty, 0);
        cart.total_price = remainingItems.reduce((sum, item) => sum + item.total_price, 0);
        await cart.save();
    }


    return saveNewOrder;
};

exports.getArrayDate = async (startDate, endDate, typeGet) => {
    const arrayDate = [];
    if (typeGet === "Date") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
            arrayDate.push(new Date(date));
        }
    } else if (typeGet === "Month") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let currentMonth = start.getMonth();
        let currentYear = start.getFullYear();

        while (currentYear < end.getFullYear() || (currentYear === end.getFullYear() && currentMonth <= end.getMonth())) {
            arrayDate.push(new Date(currentYear, currentMonth));
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
        }
    } else if (typeGet === "Year") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let currentYear = start.getFullYear();

        while (currentYear <= end.getFullYear()) {
            arrayDate.push(new Date(currentYear, 0));
            currentYear++;
        }
    }

    return arrayDate;
};

exports.createOrderFromGuestItems = async (items, typeOrder, tableNumber) => {
    if (!items || items.length === 0) {
        return false;
    }

    const total_item = items.reduce((sum, item) => sum + item.qty, 0);
    const total_price = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const newOrder = new Order({
        customer_id: null,
        cart_id: null,
        first_name: "Khách",
        last_name: "vãng lai",
        total_item: total_item,
        total_price: total_price,
        status: "NEW",
        type_order: typeOrder,
        order_source: "table",
        table_number: tableNumber,
        payment_method: typeOrder === "cash" ? "tiền mặt" : (typeOrder === "transfer" ? "chuyển khoản" : ""),
        is_payment: false,
        is_active: true,
    });

    const saveNewOrder = await newOrder.save();

    const listOrder = await Order.find({});
    const admin = await Admin.find({});
    for (const ad of admin) {
        if (ad.socket_id && UpdateOrder) {
            UpdateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
        }
    }

    await Promise.all(
        items.map(async (item) => {
            const newOrderItem = new OrderItem({
                order_id: saveNewOrder.id,
                product_id: item.id,
                product_name: item.product_name,
                product_image: item.product_image,
                qty: item.qty,
                price: item.price,
                total_price: item.price * item.qty,
                is_active: true,
            });
            await newOrderItem.save();
        })
    );

    return saveNewOrder;
};
