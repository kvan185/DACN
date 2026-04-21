const db = require("../models");
const Message = db.message;
const Admin = db.admin;
const Customer = db.customer;
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Multer and file upload config
const CHAT_UPLOAD_DIR = path.join(__dirname, "../../static/uploads/chat");
if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CHAT_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `${timestamp}-${file.originalname.replace(/\s+/g, "_")}`);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("file");

// API: Upload file/image
exports.uploadFile = (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).send({ message: "File quá lớn! Giới hạn tối đa là 5MB." });
            }
            return res.status(500).send({ message: err.message });
        } else if (err) {
            return res.status(500).send({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).send({ message: "Vui lòng chọn file." });
        }

        const fileUrl = `/static/uploads/chat/${req.file.filename}`;
        res.status(200).send({ fileUrl });
    });
};

// API: Get message history between current user and another user
exports.getHistory = async (req, res) => {
    try {
        const { currentId, otherId, currentModel, otherModel } = req.query;

        if (!currentId || !otherId) {
            return res.status(400).send({ message: "Missing params." });
        }

        // In Staff Queue model, customer messages might have receiver: null
        // If one of the participants is a customer and it's a customer-type conversation,
        // we fetch all messages related to that customer.
        let query = {
            $or: [
                { sender: currentId, receiver: otherId },
                { sender: otherId, receiver: currentId }
            ]
        };

        // If it's a customer conversation, allow finding messages with null receiver
        if (otherModel === 'customer' || currentModel === 'customer') {
            const customerId = currentModel === 'customer' ? currentId : otherId;
            query = {
                $or: [
                    { sender: customerId, conversationType: 'customer' },
                    { receiver: customerId, conversationType: 'customer' }
                ]
            };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: 1 })
            .populate('orderId')
            .populate('sender', 'first_name last_name avatar');

        res.status(200).send(messages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// API: Get list of conversations for staff
// This is more complex as we need to group by other participant
exports.getConversations = async (req, res) => {
    try {
        const { userId, userModel, conversationType } = req.query; // conversationType: 'internal' or 'customer'

        // 1. Get messages
        let query = {
            $or: [{ sender: userId }, { receiver: userId }],
            conversationType: conversationType
        };

        // For staff viewing customer conversations, see ALL customer messages
        if (userModel === 'admin' && conversationType === 'customer') {
            query = { conversationType: 'customer' };
        }

        const messages = await Message.find(query).sort({ createdAt: -1 });

        // 2. Group by other participant
        const conversations = [];
        const seenIds = new Set();

        for (const msg of messages) {
            // If it's a customer msg, the "other" is always the customer (sender)
            let otherId, otherModel;

            if (conversationType === 'customer') {
                // If msg sender is customer, that's our conversation grouping key
                otherId = msg.senderModel === 'customer' ? msg.sender.toString() : msg.receiver.toString();
                otherModel = 'customer';
            } else {
                otherId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
                otherModel = msg.sender.toString() === userId ? msg.receiverModel : msg.senderModel;
            }

            if (!seenIds.has(otherId) && otherId !== userId) {
                seenIds.add(otherId);

                // Fetch other participant info
                let otherInfo = null;
                if (otherModel === 'admin') {
                    otherInfo = await Admin.findById(otherId).select('first_name last_name avatar socket_id');
                } else {
                    otherInfo = await Customer.findById(otherId).select('first_name last_name avatar socket_id is_guest');
                }

                if (otherInfo) {
                    // Calculate unread count
                    let unreadCount = 0;
                    if (conversationType === 'customer') {
                        // For customer chat, count messages from this customer where isRead is false
                        unreadCount = await Message.countDocuments({
                            sender: otherId,
                            conversationType: 'customer',
                            isRead: false
                        });
                    } else {
                        // For internal chat, count messages from the other participant to current user
                        unreadCount = await Message.countDocuments({
                            sender: otherId,
                            receiver: userId,
                            conversationType: 'internal',
                            isRead: false
                        });
                    }

                    conversations.push({
                        lastMessage: msg,
                        otherParticipant: otherInfo,
                        otherModel: otherModel,
                        unreadCount: unreadCount
                    });
                }
            }
        }

        res.status(200).send(conversations);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.getUnreadCountForCustomer = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).send({ message: "Missing userId" });

        const unreadCount = await Message.countDocuments({
            receiver: userId,
            conversationType: 'customer',
            isRead: false
        });

        res.status(200).send({ unreadCount });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// API: Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { userId, otherId, conversationType } = req.body;

        let query = { isRead: false };
        if (conversationType === 'customer') {
            query.conversationType = 'customer';
            // If otherId is 'STAFF' or missing, it means the customer is reading all staff messages
            if (!otherId || otherId === 'STAFF') {
                query.receiver = userId;
            } else {
                // Otherwise, a staff is reading messages FROM a specific customer
                query.sender = otherId;
            }
        } else {
            query.sender = otherId;
            query.receiver = userId;
            query.conversationType = 'internal';
        }

        await Message.updateMany(query, { $set: { isRead: true } });
        res.status(200).send({ message: "Updated" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// API: Find user or admin by email
exports.findByEmail = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).send({ message: "Email required" });

        const admin = await Admin.findOne({ email }).select('first_name last_name avatar socket_id');
        if (admin) {
            return res.status(200).send({ user: admin, model: 'admin' });
        }

        const customer = await Customer.findOne({ email }).select('first_name last_name avatar socket_id');
        if (customer) {
            return res.status(200).send({ user: customer, model: 'customer' });
        }

        res.status(404).send({ message: "User not found" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
