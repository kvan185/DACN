const db = require("../models");
const Customer = db.customer;

exports.updateCustomer = async (customerId, data, file) => {
    const customer = await Customer.findById(customerId);

    if (!customer) {
        throw { status: 404, message: "Customer not found" };
    }

    customer.first_name = data.first_name || customer.first_name;
    customer.last_name = data.last_name || customer.last_name;
    customer.phone = data.phone || customer.phone;
    customer.age = data.age || customer.age;
    customer.gender = data.gender || customer.gender;

    if (file) {
        customer.avatar = file.filename;
    }

    return await customer.save();
};