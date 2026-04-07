import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCartStore, setCartItems, setDisplayToast } from '../../../actions/user';
import { fetchAddProductToCart, fetchGetCart } from '../../../actions/cart';
import './chatbot.scss';
import chatboxIcon from '../../../assets/img/chatbox_v4.png';

/**
 * UTILITY: Hàm này giữ tính Backward-Compatible. 
 * Nếu API mất mạng và rơi vào Fallback dùng Regex [CART:..], code này vẫn bóc tách và tạo Nút Nhúng (Inline) xuất sắc.
 * Nếu API dùng AI Function Call xịn, Regex tự động bỏ qua và ném ra Markdown thuần mượt mà.
 */
const renderMessageContentSafe = (text, handleQuickAdd) => {
    if (!text) return null;
    const regex = /\[CART:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/g;
    let parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<ReactMarkdown key={`txt-${lastIndex}`}>{text.substring(lastIndex, match.index)}</ReactMarkdown>);
        }
        
        const pId = match[1];
        const pName = match[2];
        const pPrice = match[3];
        const numPrice = Number(pPrice.replace(/[^0-9]/g,""));
        
        parts.push(
            <div key={`cart-${match.index}`} className="chat-cart-card">
                 <div className="ccc-info">
                    <span className="ccc-name">{pName}</span>
                    <span className="ccc-price">{numPrice ? numPrice.toLocaleString('vi', { style: 'currency', currency: 'VND' }) : pPrice}</span>
                </div>
                <button className="ccc-btn" onClick={() => handleQuickAdd(pId)}>
                    <i className="fa-solid fa-cart-plus"></i> Thêm vào giỏ
                </button>
            </div>
        );
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
        parts.push(<ReactMarkdown key={`txt-${lastIndex}`}>{text.substring(lastIndex)}</ReactMarkdown>);
    }
    
    return parts;
};

/**
 * UTILITY: Render Action Card được gửi từ AI Function Call (Tách biệt khỏi Text)
 */
const renderActionCards = (actions, handleQuickAdd) => {
    if (!actions || actions.length === 0) return null;

    return (
        <div className="chat-actions-container" style={{ marginTop: '12px' }}>
            {actions.map((action, idx) => {
                if (action.type === 'add_to_cart') {
                    // Safety check chống Crash nếu DB lỗi
                    if (!action.product_id || !action.name) return null;
                    
                    const numPrice = Number(String(action.price || 0).replace(/[^0-9]/g,""));
                    return (
                        <div key={`act-${idx}`} className="chat-cart-card">
                             <div className="ccc-info">
                                <span className="ccc-name">{action.name}</span>
                                <span className="ccc-price">{numPrice ? numPrice.toLocaleString('vi', { style: 'currency', currency: 'VND' }) : action.price}</span>
                            </div>
                            <button className="ccc-btn" onClick={() => handleQuickAdd(action.product_id)}>
                                <i className="fa-solid fa-cart-plus"></i> Thêm vào giỏ
                            </button>
                        </div>
                    )
                }
                return null;
            })}
        </div>
    );
};


const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreamingGlobal, setIsStreamingGlobal] = useState(false);
    const messagesEndRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const user = JSON.parse(sessionStorage.getItem("user"));
    const accessToken = sessionStorage.getItem("accessToken");

    useEffect(() => {
        const savedHistory = sessionStorage.getItem('chat_history');
        if (savedHistory) {
            setMessages(JSON.parse(savedHistory));
        } else {
            setMessages([
                { role: 'bot', content: 'Chào bạn! Mình là trợ lý dinh dưỡng chuyên nghiệp sử dụng AI Advanced. Mình có thể giúp gì cho bạn hôm nay?' }
            ]);
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
        const completeMsgs = messages.filter(m => !m.isStreamingQuery);
        sessionStorage.setItem('chat_history', JSON.stringify(completeMsgs));
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const toggleChat = () => setIsOpen(!isOpen);

    const handleQuickAdd = async (productId) => {
        if (!productId) return;
        
        const orderSource = localStorage.getItem('orderSource');

        // Logic cho đơn tại bàn (không cần login)
        if (orderSource === 'table') {
            let guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
            
            // Tìm thông tin sản phẩm từ menu cache trong chatbot (nếu có) hoặc mặc định
            // Để đơn giản và chính xác, ta chỉ cần productId, backend/logic sẽ xử lý tiếp.
            // Nhưng guestCart ở ProductCard.jsx cần nhiều info hơn.
            // Tôi sẽ fetch nhanh thông tin sản phẩm
            try {
                const res = await fetch(`/api/product/${productId}`);
                const product = await res.json();
                
                const existingItemIndex = guestCart.findIndex(item => item.id === productId);
                if (existingItemIndex > -1) {
                    guestCart[existingItemIndex].qty += 1;
                    guestCart[existingItemIndex].total_price = guestCart[existingItemIndex].qty * product.price;
                } else {
                    guestCart.push({
                        id: productId,
                        product_id: productId,
                        product_name: product.name,
                        product_image: product.image_url || 'no-image.png',
                        price: product.price,
                        qty: 1,
                        total_price: product.price
                    });
                }
                
                localStorage.setItem('guestCart', JSON.stringify(guestCart));
                dispatch(setCartItems(guestCart));
                dispatch(setCartStore({
                    id: 'guest',
                    total_item: guestCart.reduce((sum, i) => sum + i.qty, 0),
                    total_price: guestCart.reduce((sum, i) => sum + i.total_price, 0)
                }));
                dispatch(setDisplayToast(true));
                return;
            } catch (err) {
                console.error("Lỗi thêm vào giỏ hàng guest:", err);
            }
        }

        // Logic cho đơn Online (yêu cầu login)
        if (user && accessToken) {
            let itemProduct = [{ id: productId, qty: 1 }];
            await fetchAddProductToCart(accessToken, itemProduct);

            const response = await fetchGetCart(accessToken);
            const data = await response.json();

            if (data && data.cart) {
                dispatch(setCartStore(data.cart));
                dispatch(setCartItems(data.cartItems));
                dispatch(setDisplayToast(true));
            } else {
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    };

    const handleSend = (text) => {
        if (!text.trim() || isStreamingGlobal) return;

        const userMsg = { role: 'user', content: text };
        const historyForApi = messages.filter(m => m.role && !m.isStreamingQuery).slice(-10);
        
        const botPlaceholder = { 
            role: 'bot', 
            isStreamingQuery: true, 
            queryPayload: { message: text, history: historyForApi }
        };

        setMessages([...messages, userMsg, botPlaceholder]);
        setInput('');
        setIsStreamingGlobal(true);
    };

    return (
        <div className="chatbot-wrapper">
            <div className={`chatbot-icon ${isOpen ? 'active' : ''}`} onClick={toggleChat}>
                <img src={chatboxIcon} alt="NutriBot" />
            </div>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h4><i className="fa-solid fa-robot"></i> NutriBot</h4>
                        <div className="header-actions">
                            <button className="clear-btn" onClick={() => {
                                setMessages([{ role: 'bot', content: 'Lịch sử đã được xóa!' }]);
                                sessionStorage.removeItem('chat_history');
                            }} title="Xóa lịch sử">
                                <i className="fa-solid fa-trash"></i>
                            </button>
                            <button className="close-btn" onClick={toggleChat}>
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div className="chatbot-body">
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.role}`}>
                                {msg.isStreamingQuery ? (
                                    <StreamingMessage 
                                        payload={msg.queryPayload}
                                        handleQuickAdd={handleQuickAdd}
                                        onComplete={(finalObj) => {
                                            setMessages(prev => {
                                                const msgs = [...prev];
                                                // Lưu lại Cấu trúc JSON Full bao gồm chữ và UI Actions 
                                                msgs[index] = { role: 'bot', content: finalObj.text, actions: finalObj.actions };
                                                return msgs;
                                            });
                                            setIsStreamingGlobal(false);
                                        }}
                                        scrollToBottom={scrollToBottom}
                                    />
                                ) : (
                                    <div className="message-content">
                                        {msg.isFallback && (
                                            <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '8px', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', border: '1px solid #ffeeba', fontWeight: "bold" }}>
                                                <i className="fa-solid fa-triangle-exclamation"></i> Chế độ Fallback: Hệ thống AI đang tạm nghỉ, bot tự động lấy sản phẩm giúp bạn.
                                            </div>
                                        )}
                                        {msg.source === 'rule' && (
                                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginBottom: '6px', marginTop: '-4px' }}>
                                                <i className="fa-solid fa-bolt"></i> Trả lời Siêu tốc (Hệ thống)
                                            </div>
                                        )}
                                        {msg.source === 'ai' && msg.role === 'bot' && (
                                            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '6px', marginTop: '-4px' }}>
                                                <i className="fa-solid fa-brain"></i> Trợ lý AI Phân tích
                                            </div>
                                        )}
                                        
                                        {renderMessageContentSafe(msg.content, handleQuickAdd)}
                                        
                                        {renderActionCards(msg.actions, handleQuickAdd)}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} style={{ float: "left", clear: "both" }} />
                    </div>

                    <div className="chatbot-quick-replies">
                        <button onClick={() => handleSend('Tôi muốn giảm cân')}>Giảm cân</button>
                        <button onClick={() => handleSend('Tôi muốn tăng cơ')}>Tăng cơ</button>
                    </div>

                    <div className="chatbot-footer">
                        <input
                            type="text"
                            placeholder="Nhắn tin cho NutriBot..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                            disabled={isStreamingGlobal}
                        />
                        <button onClick={() => handleSend(input)} disabled={isStreamingGlobal || !input.trim()}>
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;

/**
 * COMPONENT TÁCH BIỆT STREAMING - XỬ LÝ HỖN HỢP TEXT VÀ FUNCTION JSON
 */
const StreamingMessage = ({ payload, handleQuickAdd, onComplete, scrollToBottom }) => {
    const [streamText, setStreamText] = useState('');
    const [uiActions, setUiActions] = useState([]);
    const [isFallback, setIsFallback] = useState(false);
    const [sourceType, setSourceType] = useState('ai');
    
    const textRef = useRef(''); 
    const actionsRef = useRef([]);
    const isFallbackRef = useRef(false);
    const isSourceTypeRef = useRef('ai');
    const isFetched = useRef(false);

    useEffect(() => {
        if (isFetched.current) return;
        isFetched.current = true;
        let isActive = true;

        const startStream = async () => {
            try {
                const res = await fetch('/api/chatbot/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.body) throw new Error("Stream not supported");
                
                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");

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
                                
                                // Ghi nhận Băng tần xử lý AI vs Rule
                                if (parsed.source) {
                                    isSourceTypeRef.current = parsed.source;
                                    if (isActive) setSourceType(parsed.source);
                                }
                                
                                // Xử lý Fallback Database khẩn cấp từ Server
                                if (parsed.fallback) {
                                    isFallbackRef.current = true;
                                    if (isActive) setIsFallback(true);
                                    
                                    if (parsed.actions) {
                                        parsed.actions.forEach(a => actionsRef.current.push(a));
                                    }
                                    if (parsed.text) {
                                        textRef.current += parsed.text;
                                    }
                                    
                                    if (isActive) {
                                        setUiActions([...actionsRef.current]);
                                        setStreamText(textRef.current);
                                        scrollToBottom();
                                    }
                                }
                                // Chế độ Tool thông thường
                                else if (parsed.action) {
                                    actionsRef.current.push(parsed.action);
                                    if (isActive) {
                                        setUiActions([...actionsRef.current]);
                                        scrollToBottom();
                                    }
                                } 
                                // Text bình thường
                                else if (parsed.text) {
                                    textRef.current += parsed.text;
                                    if (isActive) {
                                        setStreamText(textRef.current);
                                        scrollToBottom();
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            } catch (error) {
                console.error("Stream Error:", error);
                if (isActive && !textRef.current) {
                    textRef.current = "Xin lỗi, tổng đài hiện đang bận do mất mạng.";
                    setStreamText(textRef.current);
                }
            } finally {
                if (isActive) {
                    onComplete({ 
                        text: textRef.current, 
                        actions: actionsRef.current,
                        isFallback: isFallbackRef.current,
                        source: isSourceTypeRef.current
                    });
                }
            }
        };

        startStream();

        return () => {
            isActive = false;
        };
    }, []);

    return (
        <div className="message-content">
            {isFallback && (
                <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '8px', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', border: '1px solid #ffeeba', fontWeight: "bold" }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Chế độ Fallback: Hệ thống AI đang tạm nghỉ, bot tự động lấy sản phẩm giúp bạn.
                </div>
            )}
            {!isFallback && sourceType === 'rule' && (
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginBottom: '6px', marginTop: '-4px' }}>
                    <i className="fa-solid fa-bolt"></i> Trả lời Siêu tốc (Hệ thống)
                </div>
            )}
            {!isFallback && sourceType === 'ai' && (
                <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '6px', marginTop: '-4px' }}>
                    <i className="fa-solid fa-brain"></i> Trợ lý AI Phân tích
                </div>
            )}
            {renderMessageContentSafe(streamText, handleQuickAdd)}
            {renderActionCards(uiActions, handleQuickAdd)}
            <span className="dot" style={{ display: sourceType === 'ai' ? 'inline-block' : 'none', opacity: 0.5 }}>...</span>
        </div>
    );
};
