import React, { useState, useEffect, useRef } from "react";
import { socket } from "../../../socket";
import axios from "axios";
import { 
    FaMinus, FaTimes, FaPaperPlane, FaImage, FaPaperclip, 
    FaChevronLeft, FaSearch, FaPlus 
} from "react-icons/fa";
import "./messenger.scss";

const host = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const Messenger = () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("colleague"); // 'colleague' or 'customer'
    const [conversations, setConversations] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isMinimized, setIsMinimized] = useState(false);
    const [showAddEmail, setShowAddEmail] = useState(false);
    const [emailInput, setEmailInput] = useState("");
    const [previewImage, setPreviewImage] = useState(null);
    const [typingInfo, setTypingInfo] = useState({ customerId: null, staffName: null, isTyping: false });
    const [otherStaffTyping, setOtherStaffTyping] = useState({}); // customerId -> staffName
    
    const messageListRef = useRef(null);

    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        const handleShareOrder = (e) => {
            if (!selectedContact) {
                alert("Hãy chọn nhân viên hoặc khách hàng để gửi!");
                return;
            }
            const orderData = e.detail;
            setIsOpen(true);
            setIsMinimized(false);
            
            // Only share if we have a contact (already checked)
            sendOrderMessage(orderData);
            toast.success("Đã gửi thông tin đơn hàng!");
        };
        const handleShareContent = (e) => {
            setIsOpen(true);
            setIsMinimized(false);
            setNewMessage(e.detail || "");
        };

        window.addEventListener('toggleMessenger', handleToggle);
        window.addEventListener('shareOrderToChat', handleShareOrder);
        window.addEventListener('shareContentToChat', handleShareContent);

        return () => {
            window.removeEventListener('toggleMessenger', handleToggle);
            window.removeEventListener('shareOrderToChat', handleShareOrder);
            window.removeEventListener('shareContentToChat', handleShareContent);
        };
    }, [selectedContact, activeTab]);

    useEffect(() => {
        if (isOpen && !selectedContact) {
            fetchConversations();
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (selectedContact) {
            fetchHistory();
            markAsRead();
        }
    }, [selectedContact]);

    useEffect(() => {
        if (!user) return;
        socket.emit("adminConnect", user.id || user._id);
        fetchTotalUnread();

        socket.on("receiveMessage", (data) => {
            const currentUserId = user.id || user._id;
            const messageSenderId = data.sender?._id || data.sender;
            
            let isRelevant = false;
            if (activeTab === 'colleague') {
                isRelevant = selectedContact && (messageSenderId === selectedContact.id);
            } else {
                if (selectedContact) {
                    const customerId = activeTab === 'customer' ? selectedContact.id : null;
                    isRelevant = (data.conversationType === 'customer' && 
                                 (data.senderModel === 'customer' ? messageSenderId === customerId : data.receiver === customerId));
                }
            }

            if (isRelevant) {
                setMessages(prev => {
                    if (messageSenderId === currentUserId && prev.some(m => (m.id === data.id || m.localId === data.localId))) return prev;
                    return [...prev, data];
                });
                scrollToBottom();
                markAsRead();
            }
            fetchConversations();
            fetchTotalUnread();
        });

        socket.on("messageSent", (data) => {
            setMessages(prev => {
                const index = prev.findIndex(m => m.isLocal && m.localId === data.localId);
                if (index !== -1) {
                    const newList = [...prev];
                    newList[index] = data;
                    return newList;
                }
                return prev;
            });
        });

        socket.on("staffTyping", ({ staffName, customerId, isTyping }) => {
            if (staffName === (user.first_name + " " + user.last_name)) return;
            setOtherStaffTyping(prev => {
                const newState = { ...prev };
                if (isTyping) newState[customerId] = staffName;
                else delete newState[customerId];
                return newState;
            });
        });

        socket.on("displayTyping", ({ senderId, senderName, isTyping, conversationType }) => {
            if (selectedContact && senderId === selectedContact.id) {
                setTypingInfo({ customerId: senderId, staffName: senderName, isTyping });
            }
        });

        return () => {
            socket.off("receiveMessage");
            socket.off("messageSent");
            socket.off("staffTyping");
            socket.off("displayTyping");
        };
    }, [selectedContact, activeTab, user]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messageListRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
            }
        }, 100);
    };

    const fetchTotalUnread = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${host}/api/messages/unread-count-admin`, {
                params: { adminId: user.id || user._id }
            });
            window.dispatchEvent(new CustomEvent('unreadUpdate', { detail: response.data.total }));
        } catch (error) { console.error("Fetch total unread error:", error); }
    };

    const fetchConversations = async () => {
        try {
            const response = await axios.get(`${host}/api/messages/conversations`, {
                params: {
                    userId: user.id || user._id,
                    userModel: 'admin',
                    conversationType: activeTab === 'colleague' ? 'internal' : 'customer'
                }
            });
            setConversations(response.data);
            fetchTotalUnread();
        } catch (error) { console.error("Fetch conversations error:", error); }
    };

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${host}/api/messages/history`, {
                params: {
                    currentId: user.id || user._id,
                    otherId: selectedContact.id,
                    currentModel: 'admin',
                    otherModel: selectedContact.model
                }
            });
            setMessages(response.data);
            scrollToBottom();
        } catch (error) { console.error("Fetch history error:", error); }
    };

    const markAsRead = async () => {
        if (!selectedContact) return;
        try {
            await axios.put(`${host}/api/messages/read`, {
                userId: user.id || user._id,
                otherId: selectedContact.id,
                conversationType: activeTab === 'colleague' ? 'internal' : 'customer'
            });
            fetchConversations();
            fetchTotalUnread();
        } catch (error) { console.error("Mark as read error:", error); }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        const localId = Date.now();
        const msgData = {
            sender: user.id || user._id,
            senderModel: 'admin',
            receiver: selectedContact.id,
            receiverModel: selectedContact.model,
            type: 'text',
            content: newMessage,
            conversationType: activeTab === 'colleague' ? 'internal' : 'customer',
            localId: localId
        };

        socket.emit("sendMessage", msgData);
        setMessages(prev => [...prev, { ...msgData, createdAt: new Date(), id: localId, isLocal: true }]);
        setNewMessage("");
        scrollToBottom();
        
        socket.emit("typing", {
            receiver: selectedContact.id, receiverModel: selectedContact.model,
            isTyping: false, senderId: user.id || user._id,
            senderName: user.first_name + " " + user.last_name,
            conversationType: activeTab === 'colleague' ? 'internal' : 'customer'
        });
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!selectedContact) return;
        socket.emit("typing", {
            receiver: selectedContact.id,
            receiverModel: selectedContact.model,
            isTyping: e.target.value.length > 0,
            senderId: user.id || user._id,
            senderName: user.first_name + " " + user.last_name,
            conversationType: activeTab === 'colleague' ? 'internal' : 'customer'
        });
    };

    const handleAddByEmail = async (e) => {
        e.preventDefault();
        if (!emailInput.trim()) return;
        try {
            const res = await axios.get(`${host}/api/messages/find-by-email`, { params: { email: emailInput } });
            const target = res.data;
            setSelectedContact({
                id: target.user.id || target.user._id,
                name: `${target.user.first_name} ${target.user.last_name}`,
                avatar: target.user.avatar,
                model: target.model
            });
            setActiveTab(target.model === 'admin' ? 'colleague' : 'customer');
            setShowAddEmail(false);
            setEmailInput("");
        } catch (error) { alert("Không tìm thấy người dùng này!"); }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file || file.size > 5 * 1024 * 1024) return alert("File quá lớn (>5MB)");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const uploadRes = await axios.post(`${host}/api/messages/upload`, formData);
            const msgData = {
                sender: user.id || user._id, senderModel: 'admin',
                receiver: selectedContact.id, receiverModel: selectedContact.model,
                type: type, fileUrl: uploadRes.data.fileUrl, content: file.name,
                conversationType: activeTab === 'colleague' ? 'internal' : 'customer'
            };
            socket.emit("sendMessage", msgData);
            setMessages(prev => [...prev, { ...msgData, createdAt: new Date(), id: Date.now() }]);
            scrollToBottom();
        } catch (error) { console.error("Upload error:", error); }
    };

    const sendOrderMessage = (orderData) => {
        const msgData = {
            sender: user.id || user._id, senderModel: 'admin',
            receiver: selectedContact.id, receiverModel: selectedContact.model,
            type: 'order', orderId: orderData.id || orderData._id,
            content: `Đơn hàng #${orderData.id || orderData._id}`,
            conversationType: activeTab === 'colleague' ? 'internal' : 'customer'
        };
        socket.emit("sendMessage", msgData);
        setMessages(prev => [...prev, { ...msgData, createdAt: new Date(), id: Date.now(), orderId: orderData }]);
        scrollToBottom();
    };

    if (!isOpen) return null;

    const filteredConversations = conversations.filter(c => 
        `${c.otherParticipant.first_name} ${c.otherParticipant.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getAvatar = (avatar) => {
        if (!avatar) return DEFAULT_AVATAR;
        if (avatar.startsWith('http')) return avatar;
        return `${host}${avatar}`;
    };

    return (
        <>
            <div className={`messenger-staff ${isMinimized ? 'minimized' : ''}`}>
                <div className="messenger-header">
                    <div className="title">Messenger Staff</div>
                    <div className="actions">
                        <FaMinus onClick={() => setIsMinimized(!isMinimized)} />
                        <FaTimes onClick={() => setIsOpen(false)} />
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        <div className="messenger-tabs">
                            <div className={`tab ${activeTab === 'colleague' ? 'active' : ''}`} onClick={() => { setActiveTab('colleague'); setSelectedContact(null); }}>
                                Đồng nghiệp
                                {conversations.some(c => activeTab !== 'colleague' && c.unreadCount > 0 && c.otherModel === 'admin') && <span className="tab-badge-dot"></span>}
                            </div>
                            <div className={`tab ${activeTab === 'customer' ? 'active' : ''}`} onClick={() => { setActiveTab('customer'); setSelectedContact(null); }}>
                                Khách hàng
                                {conversations.some(c => activeTab !== 'customer' && c.unreadCount > 0 && c.otherModel === 'customer') && <span className="tab-badge-dot"></span>}
                            </div>
                        </div>

                        <div className="messenger-content">
                            {!selectedContact ? (
                                <>
                                    <div className="search-bar-staff">
                                        <div className="search-box">
                                            <FaSearch />
                                            <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>
                                        <button className="add-plus-btn" onClick={() => setShowAddEmail(!showAddEmail)} title="Thêm cuộc hội thoại">
                                            <FaPlus />
                                        </button>
                                    </div>

                                    {showAddEmail && (
                                        <form className="add-email-form" onSubmit={handleAddByEmail}>
                                            <input type="email" placeholder="Nhập email..." value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required />
                                            <button type="submit">Thêm</button>
                                        </form>
                                    )}

                                    <div className="contact-list">
                                        {filteredConversations.map((conv, idx) => {
                                            const otherId = conv.otherParticipant.id || conv.otherParticipant._id;
                                            return (
                                                <div key={idx} className={`contact-item ${conv.unreadCount > 0 ? 'unread' : ''}`}
                                                    onClick={() => setSelectedContact({
                                                        id: otherId,
                                                        name: `${conv.otherParticipant.first_name} ${conv.otherParticipant.last_name}`,
                                                        avatar: conv.otherParticipant.avatar,
                                                        model: conv.otherModel
                                                    })}
                                                >
                                                    <div className="avatar-wrapper">
                                                        <img src={getAvatar(conv.otherParticipant.avatar)} alt="avatar" />
                                                        {conv.unreadCount > 0 && <span className="unread-count-badge">{conv.unreadCount}</span>}
                                                    </div>
                                                    <div className="contact-info">
                                                        <div className="name-row">
                                                            <div className="name">{conv.otherParticipant.first_name} {conv.otherParticipant.last_name}</div>
                                                            {otherStaffTyping[otherId] && <span className="typing-hint">@{otherStaffTyping[otherId]} đang trả lời...</span>}
                                                        </div>
                                                        <div className="last-msg">{conv.lastMessage?.content || "[Tệp đính kèm]"}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="chat-view">
                                    <div className="chat-header">
                                        <FaChevronLeft className="back-btn" onClick={() => setSelectedContact(null)} />
                                        <div className="name-wrapper">
                                            <span className="name">{selectedContact.name}</span>
                                            {otherStaffTyping[selectedContact.id] && (
                                                <span className="staff-typing-overlay">(@{otherStaffTyping[selectedContact.id]} đang gõ...)</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="message-list" ref={messageListRef}>
                                        {messages.map((msg, idx) => {
                                            const senderId = msg.sender?._id || msg.sender;
                                            const isSentByMe = senderId === (user.id || user._id);
                                            
                                            // Labels
                                            let label = null;
                                            if (!isSentByMe && activeTab === 'customer') {
                                                if (msg.senderModel === 'admin') {
                                                    const sName = msg.sender?.first_name ? `${msg.sender.first_name} ${msg.sender.last_name}` : "Nhân viên";
                                                    label = `@${sName}`;
                                                } else if (msg.senderModel === 'customer') {
                                                    label = "Khách hàng";
                                                }
                                            }

                                            return (
                                                <div key={idx} className={`message-bubble ${isSentByMe ? 'sent' : 'received'} ${label && msg.senderModel === 'admin' ? 'other-staff' : ''}`}>
                                                    {label && <div className="sender-name-label">{label}</div>}
                                                    {msg.type === 'text' && <div>{msg.content}</div>}
                                                    {msg.type === 'image' && <img src={`${host}${msg.fileUrl}`} className="msg-image" alt="sent" onClick={() => setPreviewImage(`${host}${msg.fileUrl}`)} />}
                                                    {msg.type === 'file' && <a href={`${host}${msg.fileUrl}`} target="_blank" style={{color: 'inherit'}}>{msg.content}</a>}
                                                    {msg.type === 'order' && msg.orderId && (
                                                        <div className="order-card">
                                                            <div className="order-id">Đơn: #{msg.orderId._id || msg.orderId.id || msg.orderId}</div>
                                                            <a href={`/staff/order/detail/${msg.orderId._id || msg.orderId.id}`} className="order-link">Xem chi tiết</a>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {typingInfo.isTyping && typingInfo.customerId === selectedContact.id && (
                                            <div className="message-bubble received typing">
                                                <span>...</span>
                                            </div>
                                        )}
                                    </div>
                                    <form className="chat-input" onSubmit={handleSendMessage}>
                                        <label><FaImage className="icon-btn" /><input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} /></label>
                                        <label><FaPaperclip className="icon-btn" /><input type="file" hidden onChange={(e) => handleFileUpload(e, 'file')} /></label>
                                        <div className="input-wrapper">
                                            <input 
                                                type="text" 
                                                placeholder="Nhập tin nhắn..." 
                                                value={newMessage} 
                                                onChange={handleTyping} 
                                            />
                                        </div>
                                        <button type="submit" style={{border: 'none', background: 'none'}}><FaPaperPlane className="icon-btn" /></button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {previewImage && (
                <div className="light-box-overlay" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Preview" />
                </div>
            )}
        </>
    );
};

export default Messenger;
