const { parse } = require('json2csv');
const path = require('path');
const fs = require('fs');
const db = require("../models");
const Order = db.order;
const ConvertHelper = require("../helpers/convert.helper.js");

exports.calcu = async (req, res) => {
    try {
        const result = [];
        const typeRevenue = req.body.typeRevenue;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;

        const arrayDate = await ConvertHelper.getArrayDate(startDate, endDate, typeRevenue);

        let totalRevenueSum = 0;
        let totalOrdersCount = 0;

        if (typeRevenue === "Date") {
            for (let i = 0; i < arrayDate.length; i++) {
                const startDate = new Date(arrayDate[i]);
                const endDate = new Date(arrayDate[i]);
                endDate.setDate(endDate.getDate() + 1);

                const orders = await Order.find({
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    status: "COMPLETED"
                });

                let totalRevenue = 0;
                for (const order of orders) {
                    totalRevenue += order.total_price;
                }
                totalRevenueSum += totalRevenue;
                totalOrdersCount += orders.length;

                result.push([arrayDate[i], totalRevenue]);
            }
        } else if (typeRevenue === "Month") {
            for (let i = 0; i < arrayDate.length; i++) {
                const startDate = new Date(arrayDate[i]);
                const endDate = new Date(arrayDate[i]);
                endDate.setMonth(endDate.getMonth() + 1);

                const orders = await Order.find({
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    status: "COMPLETED"
                });

                let totalRevenue = 0;
                for (const order of orders) {
                    totalRevenue += order.total_price;
                }
                totalRevenueSum += totalRevenue;
                totalOrdersCount += orders.length;

                result.push([arrayDate[i], totalRevenue]);
            }
        } else if (typeRevenue === "Year") {
            for (let i = 0; i < arrayDate.length; i++) {
                const startDate = new Date(arrayDate[i]);
                const endDate = new Date(arrayDate[i]);
                endDate.setFullYear(endDate.getFullYear() + 1);

                const orders = await Order.find({
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    status: "COMPLETED"
                });

                let totalRevenue = 0;
                for (const order of orders) {
                    totalRevenue += order.total_price;
                }
                totalRevenueSum += totalRevenue;
                totalOrdersCount += orders.length;

                result.push([arrayDate[i], totalRevenue]);
            }
        }

        const summary = {
            totalRevenue: totalRevenueSum,
            totalOrders: totalOrdersCount,
            avgOrderValue: totalOrdersCount > 0 ? Math.round(totalRevenueSum / totalOrdersCount) : 0
        };

        res.status(200).send({ typeRevenue, result, summary });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.exportCSV = async (req, res) => {
    try {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(req.body.endDate);
        const orders = await Order.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            },
            status: "COMPLETED"
        });

        const dateTime = new Date().toISOString().slice(-24).replace(/\D/g, '').slice(0, 14);

        const filePath = path.join("static", "csv-" + dateTime + ".csv");

        const fieldName = ["ID", "First Name", "Last Name", "Phone", "Email", "Status", "Total Price"];
        const opts = { fieldName };
        const fields = [["ID", "First Name", "Last Name", "Phone", "Email", "Status", "Total Price"]];
        let totalRevenue = 0;
        for (const order of orders) {
            totalRevenue += order.total_price;
            var newField = [order.id, order.first_name, order.last_name, order.phone, order.email, order.status, order.total_price];
            fields.push(newField);
        }
        fields.push(["", "", "", "", "", "", totalRevenue]);
        let csv = parse(fields,opts);
        fs.writeFile(filePath, csv, function (err) {
            if (err) {
                return res.json(err).status(500);
            }
            else {
                setTimeout(function () {
                    fs.unlink(filePath, function (err) {
                        if (err) {
                            console.error(err);
                        }
                        console.log('File has been Deleted');
                    });

                }, 30000);
                res.attachment('export.csv');
                res.status(200).send(csv);
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};