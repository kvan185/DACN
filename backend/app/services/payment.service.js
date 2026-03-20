const config = require("../config/default.json");
const moment = require("moment");
const crypto = require("crypto");
const qs = require("qs");
const convertHelper = require("../helpers/convert.helper");

const sortObject = (obj) => {
    let sorted = {};
    let keys = Object.keys(obj).map((k) => encodeURIComponent(k)).sort();

    keys.forEach((key) => {
        sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    });

    return sorted;
};

const createPaymentUrl = async (cartId, bankCode, ipAddr) => {
    if (!cartId) {
        throw { status: 400, message: "Not cart id" };
    }

    const order = await convertHelper.convertCartToOrder(cartId, "transfer");

    const createDate = moment().format("YYYYMMDDHHmmss");

    let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: config.vnp_TmnCode,
        vnp_Locale: "vn",
        vnp_CurrCode: "VND",
        vnp_TxnRef: order.id,
        vnp_OrderInfo: "Thanh toan cho ma GD:" + order.id,
        vnp_OrderType: "other",
        vnp_Amount: order.total_price * 100,
        vnp_ReturnUrl: config.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    if (bankCode) {
        vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });

    const hmac = crypto.createHmac("sha512", config.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;

    const paymentUrl =
        config.vnp_Url + "?" + qs.stringify(vnp_Params, { encode: false });

    return paymentUrl;
};

const vnpayReturn = (query) => {
    let vnp_Params = { ...query };

    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });

    const hmac = crypto.createHmac("sha512", config.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
        return {
            success: true,
            code: vnp_Params["vnp_ResponseCode"],
        };
    }

    return {
        success: false,
        code: "97",
    };
};

module.exports = {
    createPaymentUrl,
    vnpayReturn,
};