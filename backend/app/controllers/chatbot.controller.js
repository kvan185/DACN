const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../models");
const Product = db.product;
const ProductBOM = require("../models/productBom.model");

// --- FEATURE FLAG ---
// Bật Use_Function_Calling = true để chuyển từ Regex Tag -> Struct Object JSON trực tiếp
const USE_FUNCTION_CALLING = false;

// --- IN-MEMORY CACHE LAYER ---
let cachedMenuContext = null;
let lastCacheTime = null;
const CACHE_TTL = 3600000;

const fetchMenuData = async () => {
    const products = await Product.find({ is_active: true })
        .select('_id name price detail')
        .lean()
        .limit(100);

    const productIds = products.map(p => p._id);

    const boms = await ProductBOM.find({ product_id: { $in: productIds } })
        .populate('ingredient_id', 'name')
        .lean();

    const bomsByProduct = boms.reduce((acc, current) => {
        const prodId = current.product_id.toString();
        if (!acc[prodId]) acc[prodId] = [];
        if (current.ingredient_id) {
            acc[prodId].push(`${current.quantity}${current.unit} ${current.ingredient_id.name}`);
        }
        return acc;
    }, {});

    let menuStr = "Danh sách menu của nhà hàng:\n";
    for (const p of products) {
        const pid = p._id.toString();
        const ingredientsStr = (bomsByProduct[pid] || []).join(", ");
        menuStr += `- Món: ${p.name} | Giá: ${p.price} | ID_MÓN: ${pid}`;
        if (p.detail) {
            const shortDetail = p.detail.length > 60 ? p.detail.substring(0, 60) + "..." : p.detail;
            menuStr += ` | Chi tiết: ${shortDetail}`;
        }
        menuStr += '\n';
        if (ingredientsStr) {
            menuStr += `  Công thức: ${ingredientsStr}\n`;
        }
    }
    return menuStr;
};

const getMenuContext = async (userMessage = "") => {
    const NOW = Date.now();
    if (cachedMenuContext && lastCacheTime && (NOW - lastCacheTime < CACHE_TTL)) {
        return cachedMenuContext;
    }
    console.log("[Chatbot Cache] Miss! Đang tải Menu từ Database...");
    cachedMenuContext = await fetchMenuData();
    lastCacheTime = NOW;
    return cachedMenuContext;
};

const generateSystemPrompt = async (userMessage) => {
    try {
        const menuContext = await getMenuContext(userMessage);

        const regexInstructions = `QUAN TRỌNG KHI BÁN HÀNG: 
Khi đề xuất món ăn, BẮT BUỘC chèn tag: [CART: ID_MÓN | Tên món | Giá]
Ví dụ: "Hãy thử nhé! [CART: 64b1f... | Khoai lang nướng | 45000]"`;

        const functionInstructions = `QUAN TRỌNG KHI BÁN HÀNG (FUNCTION CALLING):
BẮT BUỘC dùng công cụ 'add_to_cart_ui' để đề xuất. Dùng đúng ID_MÓN thực tế ở Thực đơn.
[QUAN TRỌNG ĐỂ KHÔNG BỊ TRỪ ĐIỂM] 
1. Không được đưa ra lời khuyên nửa vời! Nếu khách hỏi thực đơn 3 món / 1 ngày. Bạn PHẢI liệt kê và gọi Tool ít nhất 3 lần liên tiếp cho đủ Sáng-Trưa-Chiều rồi mới được ngừng.
2. Bạn phải gọi TẤT CẢ các tool trong cùng 1 lần suy nghĩ thay vì nói rồi ngưng. Đảm bảo giải quyết trọn vẹn câu hỏi của khách!`;

        const methodRule = USE_FUNCTION_CALLING ? functionInstructions : regexInstructions;

        const systemPrompt = `
Bạn là chuyên gia dinh dưỡng và nhân viên tư vấn nhiệt tình của quán Healthy Food.
Nhiệm vụ:
1. Chỉ tư vấn món có trong menu. KHÔNG bịa món. Phân tích Calories kỹ lưỡng dựa trên yêu cầu.
2. Trả lời đầy đủ, rành mạch. Đừng bao giờ trả lời lặp lại câu hỏi của khách.
3. VIẾT MÔ TẢ MÓN ĂN CỰC KỲ NGẮN GỌN (TỐI ĐA 2 CÂU). Tập trung vào lợi ích chính và Calories. Tránh giải thích dài dòng gây chiếm diện tích khung chat.
    

${methodRule}

BỐI CẢNH DỮ LIỆU THỰC ĐƠN HIỆN TẠI (CHỈ ĐƯỢC CHỌN TRONG ĐÂY):
${menuContext}
`;
        return systemPrompt;
    } catch (error) {
        console.error("Lỗi sinh System Prompt:", error);
        return "Hệ thống đang lỗi.";
    }
};

const config = require("../config/db.config.js");

// Định nghĩa Function Tool Schema
const chatTools = [{
    functionDeclarations: [{
        name: "add_to_cart_ui",
        description: "Sử dụng tính năng này để chèn Giao diện Mua hàng khi bạn đề xuất món ăn cho khách (hỗ trợ gọi nhiều lần liên tiếp để gợi ý nhiều món).",
        parameters: {
            type: "OBJECT",
            properties: {
                product_id: { type: "STRING", description: "id_món của sản phẩm từ Menu" },
                name: { type: "STRING", description: "Tên món ăn" },
                price: { type: "NUMBER", description: "Giá tiền" }
            },
            required: ["product_id", "name", "price"]
        }
    }]
}];

// --- QUOTA PROTECTION VARIABLES ---
let isQuotaExceeded = false;
let quotaResetTime = null;

// --- HYBRID COST OPTIMIZATION ---
let statAiCalls = 0;
let statRuleCalls = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- RULE-BASED FAST RESPONDER ---
const sendRuleBasedResponse = (res, text, actions = []) => {
    statRuleCalls++;
    console.log(`[HYBRID ENGINE] ⚡ Rule-Based Executed. (Stats: Rules ${statRuleCalls} | AI ${statAiCalls} | Cứu API: ${Math.round((statRuleCalls / (statRuleCalls + statAiCalls || 1)) * 100)}%)`);
    res.write(`data: ${JSON.stringify({
        source: 'rule',
        text: text,
        actions: actions
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
};

const analyzeIntentAndHandle = async (message, res) => {
    const msg = message.toLowerCase().trim();

    // 1. Chào hỏi cơ bản
    const greetings = ['chào', 'hello', 'hi', 'ê', 'bot', 'chào bạn', 'hi bot', 'chào em'];
    if (greetings.includes(msg)) {
        return sendRuleBasedResponse(res, "Chào buổi lành! Mình là trợ lý thông minh của Healthy Food. Mình có thể lấy thực đơn, báo giá hoặc tính toán Calories giúp bạn nghen!");
    }

    // 2. Yêu cầu hiển thị thực đơn
    if (msg.includes('thực đơn') || msg.includes('menu') || msg.includes('danh sách món') || msg.includes('có món gì')) {
        const topProducts = await Product.find({ is_active: true }).limit(5).select('_id name price').lean();
        const actions = topProducts.map(p => ({
            type: "add_to_cart",
            product_id: p._id.toString(),
            name: p.name,
            price: p.price
        }));
        return sendRuleBasedResponse(res, "Dạ đây là các món tủ đang bán chạy nhất ở cửa hàng bên mình nha:", actions);
    }

    // 3. Tìm kiếm sản phẩm phổ biến
    const searchMatch = msg.match(/(có|mua|cho|tìm|thèm).* (cơm|gà|bò|trà sữa|nước ép|trà|nước|sandwich|yến mạch|salad|bánh|sinh tố)/);
    if (searchMatch) {
        const keyword = searchMatch[2];
        const products = await Product.find({ name: { $regex: keyword, $options: "i" }, is_active: true }).limit(5).select('_id name price').lean();

        if (products.length > 0) {
            const actions = products.map(p => ({
                type: "add_to_cart",
                product_id: p._id.toString(),
                name: p.name,
                price: p.price
            }));
            return sendRuleBasedResponse(res, `Dạ kho dữ liệu của mình tìm thấy ngay ${products.length} dòng khớp với "${keyword}". Bạn tham khảo nghen:`, actions);
        }
    }

    // => Bỏ qua nếu là câu hỏi phức tạp (VD: "Ăn gì ngon", "Giảm 5kg")
    return false;
};

const handleFallback = async (reqMessage, res) => {
    try {
        console.log(`[Fallback Activated] Đang tìm kiếm sản phẩm trực tiếp từ DB với từ khoá: ${reqMessage}`);
        let products = [];

        // Smart Search dựa trên Text
        if (reqMessage) {
            // Lọc bớt ký tự đặc biệt, lấy Array từ
            const keywords = reqMessage
                .replace(/[^vVnNaA-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ \-]/g, "")
                .split(" ")
                .filter(w => w.length > 2)
                .join("|");

            if (keywords) {
                // regex match name. Giới hạn top 5.
                products = await Product.find({
                    name: { $regex: keywords, $options: "i" },
                    is_active: true
                }).limit(5).select('_id name price').lean();
            }
        }

        // Nếu AI lười, không ra từ khoá khớp, tung 5 sản phẩm tự động phòng hờ
        if (products.length === 0) {
            console.log("[Fallback Query] Không khớp từ khoá, nhả Top 5 sản phẩm ngẫu nhiên.");
            products = await Product.find({ is_active: true }).limit(5).select('_id name price').lean();
        }

        const actions = products.map(p => ({
            type: "add_to_cart",
            product_id: p._id.toString(),
            name: p.name,
            price: p.price
        }));

        res.write(`data: ${JSON.stringify({
            fallback: true,
            source: 'rule',
            text: "Hiện tại hệ thống AI đang quá tải 🤖. Tôi đã dựa vào yêu cầu của bạn để tìm nhanh các món bên dưới 👇",
            actions
        })}\n\n`);

        res.write('data: [DONE]\n\n');
        return res.end();
    } catch (e) {
        console.error("[Fallback Fatal Error]:", e);
        res.write(`data: ${JSON.stringify({ text: "Hệ thống đang bảo trì, xin thông cảm." })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
    }
};

const attemptChat = async (model, message, initLog, res, retryCount = 0) => {
    try {
        const chat = model.startChat({ history: initLog });
        const result = await chat.sendMessageStream(message);

        // Báo hiệu Frontend đổi cờ Badge sang màu Tím AI
        res.write(`data: ${JSON.stringify({ source: 'ai' })}\n\n`);

        for await (const chunk of result.stream) {
            if (USE_FUNCTION_CALLING && typeof chunk.functionCalls === 'function' && chunk.functionCalls()) {
                const calls = chunk.functionCalls();
                for (const call of calls) {
                    if (call.name === "add_to_cart_ui") {
                        const { product_id, name, price } = call.args;
                        try {
                            let validProduct = null;
                            if (product_id && product_id.length === 24) {
                                validProduct = await Product.findById(product_id).select('_id name price').lean();
                            }
                            if (validProduct) {
                                res.write(`data: ${JSON.stringify({
                                    action: {
                                        type: "add_to_cart",
                                        product_id: validProduct._id.toString(),
                                        name: validProduct.name,
                                        price: validProduct.price
                                    }
                                })}\n\n`);
                            }
                        } catch (e) { console.error("[FC Validation Error]:", e.message); }
                    }
                }
            }

            try {
                const chunkText = chunk.text();
                if (chunkText) {
                    res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                }
            } catch (e) { }
        }
        res.write('data: [DONE]\n\n');
        return res.end();

    } catch (err) {
        const errorMsg = err.message || "";
        console.error(`[Gemini ERROR Encountered] Mức Retry = ${retryCount}:`, errorMsg);

        // Phát hiện Quota 429
        if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Too Many Requests")) {
            console.error(`[Gemini ERROR 429] Phát hiện API Quota hit!`);

            if (retryCount === 0) {
                console.log("[Gemini Retry] Delay 1 giây chạy lại lần chót...");
                await sleep(1000); // 1. Max wait 1 second
                return attemptChat(model, message, initLog, res, 1);
            }
        }

        // Fail hoàn toàn (Quyết định khóa hạm API 60 giây)
        isQuotaExceeded = true;
        quotaResetTime = Date.now() + 60000;
        console.warn("[Quota Sentinel] Đã kích hoạt chốt khóa API Gemini trong 60 giây tiếp theo.");

        // Tung chế độ Smart Fallback DB 
        return handleFallback(message, res);
    }
};

exports.chat = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message && req.method === 'POST') {
            return res.status(400).json({ error: "Message is required" });
        }

        const API_KEY = config.geminiApiKey;
        if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.write(`data: ${JSON.stringify({ text: "Chưa cấu hình API." })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
        }

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        // Hybrid Rule-based Intercept (Chặn đầu trước khi gọi AI)
        const isHandledByRule = await analyzeIntentAndHandle(message, res);
        if (isHandledByRule !== false) return; // Nếu rule đã chộp, return luôn giải phóng request chạy trong 10ms

        // Nếu lọt xuống tới đây là AI bắt đầu tính phí Token
        statAiCalls++;
        console.log(`[HYBRID ENGINE] 🧠 AI Executed. (Stats: Rules ${statRuleCalls} | AI ${statAiCalls})`);

        // 3. Quota Protection
        if (isQuotaExceeded) {
            const now = Date.now();
            if (now < quotaResetTime) {
                const secondsLeft = Math.ceil((quotaResetTime - now) / 1000);
                console.log(`[Quota Lock Active] Bỏ qua Gemini API, đang sử dụng Fallback... (Reset sau ${secondsLeft}s)`);
                return handleFallback(message, res);
            } else {
                console.log("[Quota Lock Released] Giải phóng tài nguyên AI sau chu kỳ 60s nghỉ.");
                isQuotaExceeded = false;
                quotaResetTime = null;
            }
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const modelOptions = { model: "gemini-2.5-flash" };
        if (USE_FUNCTION_CALLING) modelOptions.tools = chatTools;
        const model = genAI.getGenerativeModel(modelOptions);

        const systemInstruction = await generateSystemPrompt(message);

        let formattedHistory = [];
        if (history && Array.isArray(history)) {
            formattedHistory = history.map(h => {
                let txt = (h.content || "").trim();
                if (h.role === 'bot') {
                    if (txt === '' && h.actions && h.actions.length > 0) {
                        const sug = h.actions.map(a => a.name).join(", ");
                        txt = `[SystemLog: Tôi đã hiển thị thẻ giỏ hàng cho các món: ${sug}]`;
                    } else if (txt === '' && (!h.actions || h.actions.length === 0)) {
                        txt = "Tôi sẽ kiểm tra thông tin.";
                    }
                }
                return {
                    role: h.role === 'bot' ? 'model' : 'user',
                    parts: [{ text: txt }]
                };
            });
        }

        const initLog = [
            { role: "user", parts: [{ text: "SYSTEM INSTRUCTION (Read and simulate this role): " + systemInstruction }] },
            { role: "model", parts: [{ text: "Tôi đã duyệt Menu. Tôi sẽ bắt đầu tư vấn." }] },
            ...formattedHistory
        ];

        await attemptChat(model, message, initLog, res, 0);

    } catch (error) {
        console.error("Internal Chat Controller Error:", error);
        try {
            res.write(`data: ${JSON.stringify({ text: "Hệ thống đang bảo trì!" })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        } catch (e) { }
    }
};
