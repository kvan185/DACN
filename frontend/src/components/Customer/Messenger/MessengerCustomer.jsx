import React, { useState, useEffect, useRef } from "react";
import { socket } from "../../../socket";
import axios from "axios";
import { 
    FaCommentDots, FaTimes, FaRobot, FaUserTie, 
    FaPaperPlane, FaImage, FaPaperclip 
} from "react-icons/fa";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCartStore, setCartItems, setDisplayToast } from '../../../actions/user';
import { fetchAddProductToCart, fetchGetCart } from '../../../actions/cart';
import ReactMarkdown from 'react-markdown';
import "./messenger.scss";

const host = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const MessengerCustomer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("ai"); // 'ai' or 'staff'
    const [userId, setUserId] = useState(null);
    const [supportContact, setSupportContact] = useState(null);
    const [aiMessages, setAiMessages] = useState([]);
    const [staffMessages, setStaffMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isStaffTyping, setIsStaffTyping] = useState(false);
    
    const messageListRef = useRef(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const accessToken = sessionStorage.getItem("accessToken");

    const getAvatar = (avatar) => {
        if (!avatar) return DEFAULT_AVATAR;
        if (avatar.startsWith('http')) return avatar;
        return `${host}${avatar}`;
    };

    // 1. Initialize User / Guest ID & App State
    useEffect(() => {
        const initUser = async () => {
            const storedUser = JSON.parse(sessionStorage.getItem("user"));
            if (storedUser) {
                const id = storedUser.id || storedUser._id;
                setUserId(id);
            } else {
                const guestId = localStorage.getItem("guest_chat_id");
                try {
                    const res = await axios.post(`${host}/api/customer/init-guest`, { guestId });
                    const newGuestId = res.data.id || res.data._id;
                    localStorage.setItem("guest_chat_id", newGuestId);
                    setUserId(newGuestId);
                } catch (err) { console.error("Init guest error:", err); }
            }

            try {
                const res = await axios.get(`${host}/api/staff/support-contact`);
                setSupportContact(res.data);
            } catch (err) { console.error("Fetch support contact error:", err); }
        };

        const savedAiHistory = JSON.parse(sessionStorage.getItem('messenger_ai_history') || '[]');
        if (savedAiHistory.length > 0) setAiMessages(savedAiHistory);
        else setAiMessages([{ role: 'bot', content: 'Chào bạn! Mình là NutriBot - Trợ lý dinh dưỡng thông minh. Mình có thể giúp gì cho bạn?' }]);

        initUser();
    }, []);

    // 2. Socket Listeners
    useEffect(() => {
        if (!userId) return;
        socket.emit("userConnect", userId);

        socket.on("receiveMessage", (data) => {
            if (activeTab === 'staff') {
                setStaffMessages(prev => [...prev, data]);
                scrollToBottom();
            }
        });

        socket.on("displayTyping", ({ senderId, isTyping }) => {
            setIsStaffTyping(isTyping);
        });

        return () => {
            socket.off("receiveMessage");
            socket.off("displayTyping");
        };
    }, [userId, activeTab]);

    // 3. Auto-save AI History
    useEffect(() => {
        if (aiMessages.length > 0) {
            sessionStorage.setItem('messenger_ai_history', JSON.stringify(aiMessages));
        }
    }, [aiMessages]);

    useEffect(() => {
        if (isOpen && activeTab === 'staff' && userId) {
            fetchStaffHistory();
            markAsRead();
        }
    }, [isOpen, activeTab, userId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messageListRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
            }
        }, 100);
    };

    const fetchStaffHistory = async () => {
        try {
            const response = await axios.get(`${host}/api/messages/history`, {
                params: {
                    currentId: userId,
                    otherId: supportContact?._id || supportContact?.id || 'STAFF',
                    currentModel: 'customer',
                    otherModel: 'admin'
                }
            });
            setStaffMessages(response.data);
            scrollToBottom();
        } catch (error) { console.error("Fetch staff history error:", error); }
    };

    const markAsRead = async () => {
        try {
            await axios.put(`${host}/api/messages/read`, {
                userId: userId,
                otherId: 'STAFF', 
                conversationType: 'customer'
            });
        } catch (error) { console.error("Mark as read error:", error); }
    };

    const handleQuickAdd = async (productId) => {
        if (!productId) return;
        const orderSource = sessionStorage.getItem('orderSource');
        if (orderSource === 'table') {
            try {
                const res = await fetch(`/api/product/${productId}`);
                const product = await res.json();
                let guestCart = JSON.parse(sessionStorage.getItem('guestCart')) || [];
                const existingItemIndex = guestCart.findIndex(item => item.id === productId);
                if (existingItemIndex > -1) {
                    guestCart[existingItemIndex].qty += 1;
                    guestCart[existingItemIndex].total_price = guestCart[existingItemIndex].qty * product.price;
                } else {
                    guestCart.push({
                        id: productId, product_id: productId, product_name: product.name,
                        product_image: product.image_url || 'no-image.png',
                        price: product.price, qty: 1, total_price: product.price
                    });
                }
                sessionStorage.setItem('guestCart', JSON.stringify(guestCart));
                dispatch(setCartItems(guestCart));
                dispatch(setCartStore({
                    id: 'guest',
                    total_item: guestCart.reduce((sum, i) => sum + i.qty, 0),
                    total_price: guestCart.reduce((sum, i) => sum + i.total_price, 0)
                }));
                dispatch(setDisplayToast(true));
                return;
            } catch (err) { console.error("Lỗi thêm vào giỏ hàng guest:", err); }
        }
        if (user && accessToken) {
            await fetchAddProductToCart(accessToken, [{ id: productId, qty: 1 }]);
            const response = await fetchGetCart(accessToken);
            const data = await response.json();
            if (data && data.cart) {
                dispatch(setCartStore(data.cart));
                dispatch(setCartItems(data.cartItems));
                dispatch(setDisplayToast(true));
            } else navigate('/login');
        } else navigate('/login');
    };

    const handleSendAI = async (text) => {
        const userMsg = { role: 'user', content: text };
        const historyForApi = aiMessages.slice(-10);
        setAiMessages(prev => [...prev, userMsg, { role: 'bot', content: '', isStreaming: true }]);
        setIsStreaming(true);
        scrollToBottom();

        try {
            const res = await fetch(`${host}/api/chatbot/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: historyForApi })
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = '';
            let actions = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) fullText += parsed.text;
                            if (parsed.action) actions.push(parsed.action);
                            if (parsed.fallback && parsed.actions) actions.push(...parsed.actions);
                            
                            setAiMessages(prev => {
                                const newMsgs = [...prev];
                                const last = newMsgs[newMsgs.length - 1];
                                last.content = fullText;
                                last.actions = actions;
                                return newMsgs;
                            });
                            scrollToBottom();
                        } catch (e) {}
                    }
                }
            }
            setAiMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].isStreaming = false;
                return newMsgs;
            });
            setIsStreaming(false);
        } catch (error) {
            console.error("AI Stream Error:", error);
            setIsStreaming(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        const currentText = inputText;
        setInputText("");

        if (activeTab === 'ai') {
            handleSendAI(currentText);
        } else {
            const msgData = {
                sender: userId, senderModel: 'customer',
                receiver: null, receiverModel: 'admin',
                type: 'text', content: currentText, conversationType: 'customer'
            };
            socket.emit("sendMessage", msgData);
            setStaffMessages(prev => [...prev, { ...msgData, createdAt: new Date() }]);
            scrollToBottom();
            socket.emit("typing", {
                receiver: null, receiverModel: 'admin', isTyping: false,
                senderId: userId, senderName: user ? (user.first_name + " " + user.last_name) : "Khách",
                conversationType: 'customer'
            });
        }
    };

    const handleInput = (e) => {
        const val = e.target.value;
        setInputText(val);
        if (activeTab === 'staff') {
            socket.emit("typing", {
                receiver: null, receiverModel: 'admin', isTyping: val.length > 0,
                senderId: userId, senderName: user ? (user.first_name + " " + user.last_name) : "Khách",
                conversationType: 'customer'
            });
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || file.size > 5 * 1024 * 1024) return alert("File quá lớn (>5MB)");
        const formData = new FormData();
        formData.append("file", file);
        try {
            const uploadRes = await axios.post(`${host}/api/messages/upload`, formData);
            const msgData = {
                sender: userId, senderModel: 'customer',
                receiver: null, receiverModel: 'admin',
                type: 'image', fileUrl: uploadRes.data.fileUrl,
                content: file.name, conversationType: 'customer'
            };
            socket.emit("sendMessage", msgData);
            setStaffMessages(prev => [...prev, { ...msgData, createdAt: new Date() }]);
            scrollToBottom();
        } catch (error) { console.error("Upload error:", error); }
    };

    const renderActions = (actions) => {
        if (!actions || actions.length === 0) return null;
        return (
            <div className="chat-actions-container">
                {actions.map((act, i) => (
                    <div key={i} className="chat-cart-card">
                        <div className="ccc-info">
                            <span className="ccc-name">{act.name}</span>
                            <span className="ccc-price">{act.price?.toLocaleString('vi-VN')}₫</span>
                        </div>
                        <button className="ccc-btn" onClick={() => handleQuickAdd(act.product_id)}>
                            <FaPaperPlane /> Thêm vào giỏ
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="messenger-customer">
                {!isOpen && (
                    <div className="messenger-bubble" onClick={() => setIsOpen(true)}>
                        <FaCommentDots />
                    </div>
                )}

                <div className={`messenger-window ${!isOpen ? 'hidden' : ''}`}>
                    <div className="window-header">
                        <div className="brand">
                            <img src="/static/images/logo.png" alt="logo" onError={(e)=>e.target.src=DEFAULT_AVATAR} />
                            <span>Healthy Food Support</span>
                        </div>
                        <FaTimes className="close-btn" onClick={() => setIsOpen(false)} />
                    </div>

                    <div className="window-tabs">
                        <div className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
                            <FaRobot /> AI NutriBot
                        </div>
                        <div className={`tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
                            <FaUserTie /> Nhân viên
                        </div>
                    </div>

                    <div className="window-content">
                        <div className="message-list" ref={messageListRef}>
                            {(activeTab === 'ai' ? aiMessages : staffMessages).map((m, i) => {
                                const isUser = (m.role === 'user' || m.sender === userId || m.sender?._id === userId);
                                return (
                                    <div key={i} className={`msg ${isUser ? 'user' : 'bot'}`}>
                                        {m.type !== 'image' && <ReactMarkdown>{m.content}</ReactMarkdown>}
                                        {m.type === 'image' && <img src={`${host}${m.fileUrl}`} className="msg-img" alt="sent" onClick={() => setPreviewImage(`${host}${m.fileUrl}`)} />}
                                        {renderActions(m.actions)}
                                    </div>
                                );
                            })}
                            {isStaffTyping && activeTab === 'staff' && (
                                <div className="msg bot typing">
                                    <span>...</span>
                                </div>
                            )}
                        </div>
                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            {activeTab === 'staff' && (
                                <label>
                                    <FaImage className="action-icon" />
                                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                                </label>
                            )}
                            <input 
                                type="text" placeholder="Nhập nội dung..." 
                                value={inputText} onChange={handleInput}
                                disabled={isStreaming}
                            />
                            <button type="submit" disabled={isStreaming} style={{border: 'none', background: 'none'}}>
                                <FaPaperPlane className="send-btn" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            {previewImage && (
                <div className="light-box-overlay" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Preview" />
                </div>
            )}
        </>
    );
};

export default MessengerCustomer;
