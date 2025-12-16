import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: 'Xin chào! Tôi là trợ lý ảo của Shop Bán Sách. Tôi có thể giúp bạn:\n• Tìm kiếm sách\n• Xem đơn hàng\n• Tư vấn sản phẩm\n• Hỗ trợ mua hàng',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [products, setProducts] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);
    const chatboxRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Load products và tạo session khi chatbot mở
        if (isOpen && products.length === 0) {
            fetch('/api/products')
                .then(response => response.json())
                .then(data => setProducts(data))
                .catch(error => console.error('Error loading products:', error));
            
            // Tạo session cho chatbot
            if (!sessionId) {
                fetch('/chat/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                })
                .then(response => response.json())
                .then(data => {
                    if (data.sessionId) {
                        setSessionId(data.sessionId);
                        console.log('Chat session created:', data.sessionId);
                    }
                })
                .catch(error => console.error('Error creating chat session:', error));
            }
        }
    }, [isOpen, products.length, sessionId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const quickReplies = [
        "Tìm sách văn học",
        "Xem đơn hàng",
        "Sách bán chạy",
        "Khuyến mãi hôm nay",
        "Liên hệ hỗ trợ"
    ];

    const searchProducts = (query) => {
        const lowerQuery = query.toLowerCase();
        return products.filter(product => 
            product.name.toLowerCase().includes(lowerQuery) ||
            (product.description && product.description.toLowerCase().includes(lowerQuery)) ||
            (product.category && product.category.toLowerCase().includes(lowerQuery))
        ).slice(0, 5);
    };

    const formatCurrency = (price) => {
        const numPrice = Number(price) || 0;
        // Giá trong database đang lưu theo nghìn đồng, nên nhân 1000
        const actualPrice = numPrice * 1000;
        return actualPrice.toLocaleString('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }) + ' ₫';
    };

    const createProductCard = (product) => {
        return {
            type: 'product',
            product: product,
            timestamp: new Date()
        };
    };

    const getBotResponse = async (userMessage) => {
        const lowerMessage = userMessage.toLowerCase();
        
        // Xử lý tìm kiếm sản phẩm local (nhanh)
        if (lowerMessage.includes('tìm') && products.length > 0) {
            const searchResults = searchProducts(userMessage);
            
            if (searchResults.length > 0) {
                setTimeout(() => {
                    searchResults.forEach((product, index) => {
                        setTimeout(() => {
                            setMessages(prev => [...prev, createProductCard(product)]);
                        }, index * 300);
                    });
                }, 500);
                
                return `Tôi tìm thấy ${searchResults.length} cuốn sách phù hợp:`;
            }
        }
        
        // Sách bán chạy (local)
        if ((lowerMessage.includes('bán chạy') || lowerMessage.includes('phổ biến') || lowerMessage.includes('hot')) && products.length > 0) {
            const topSelling = products
                .filter(p => Number(p.sold) > 0)
                .sort((a, b) => (Number(b.sold) || 0) - (Number(a.sold) || 0))
                .slice(0, 5);
            
            if (topSelling.length > 0) {
                setTimeout(() => {
                    topSelling.forEach((product, index) => {
                        setTimeout(() => {
                            setMessages(prev => [...prev, createProductCard(product)]);
                        }, index * 300);
                    });
                }, 500);
                return `Đây là ${topSelling.length} cuốn sách bán chạy nhất:`;
            }
        }
        
        // Xem đơn hàng (local action)
        if (lowerMessage.includes('đơn hàng') || lowerMessage.includes('order')) {
            const userEmail = localStorage.getItem('userEmail');
            if (userEmail) {
                return {
                    text: 'Bạn muốn xem đơn hàng của mình? Hãy nhấn vào nút bên dưới:',
                    action: 'view_orders'
                };
            } else {
                return 'Bạn cần đăng nhập để xem đơn hàng. Vui lòng đăng nhập để tiếp tục! 🔐';
            }
        }

        // ===== GỌI API BACKEND CHO AI CHAT =====
        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: sessionId
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            console.log('Chatbot response:', data);
            
            // Return both text response and products if available
            return {
                text: data.response,
                products: data.products || []
            };

        } catch (error) {
            console.error('Chatbot API error:', error);
            
            // Fallback nếu API lỗi
            return {
                text: '😅 Xin lỗi, tôi đang gặp chút vấn đề kỹ thuật. Bạn có thể:\n• Thử lại sau\n• Liên hệ hotline: 0123-456-789\n• Email: support@shopbansach.com',
                products: []
            };
        }
    };

    const handleSendMessage = async (messageText = null) => {
        const textToSend = messageText || inputValue.trim();
        
        if (!textToSend) return;

        // Thêm tin nhắn của user
        const userMessage = {
            type: 'user',
            text: textToSend,
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Get bot response
        setTimeout(async () => {
            const response = await getBotResponse(textToSend);
            
            if (typeof response === 'object' && response.action) {
                // Response with action button
                const botResponse = {
                    type: 'bot',
                    text: response.text,
                    action: response.action,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botResponse]);
            } else if (typeof response === 'object' && response.text) {
                // Response with text and possibly products
                const botResponse = {
                    type: 'bot',
                    text: response.text,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botResponse]);
                
                // Add product cards if available
                if (response.products && response.products.length > 0) {
                    response.products.forEach((product, index) => {
                        setTimeout(() => {
                            setMessages(prev => [...prev, createProductCard(product)]);
                        }, index * 300);
                    });
                }
            } else {
                // Regular text response (backward compatibility)
                const botResponse = {
                    type: 'bot',
                    text: response,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botResponse]);
            }
            
            setIsTyping(false);
        }, 800 + Math.random() * 700);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleQuickReply = (reply) => {
        handleSendMessage(reply);
    };

    const handleProductClick = (productId) => {
        navigate(`/shopdetail/${productId}`);
        setIsOpen(false);
    };

    const handleActionClick = (action) => {
        if (action === 'view_orders') {
            navigate('/my-orders');
            setIsOpen(false);
        }
    };

    return (
        <div className="chatbot-container">
            {/* Floating Button: only show when chat is closed (so we don't duplicate close buttons) */}
            {!isOpen && (
                <button 
                    className="chatbot-toggle-btn"
                    onClick={toggleChat}
                    aria-label="Open chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window" ref={chatboxRef}>
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="chatbot-avatar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="chatbot-title">Trợ lý Shop Sách</h3>
                                <p className="chatbot-status">
                                    <span className="status-dot"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <button 
                            className="chatbot-close-btn"
                            onClick={toggleChat}
                            aria-label="Close chat"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((message, index) => (
                            <div key={index}>
                                {message.type === 'product' ? (
                                    // Product Card
                                    <div className="product-card-message">
                                        <div 
                                            className="product-card" 
                                            onClick={() => handleProductClick(message.product.id)}
                                        >
                                            <div className="product-card-image">
                                                <img 
                                                    src={message.product.img || message.product.image || '/assets/img/product-default.jpg'} 
                                                    alt={message.product.name}
                                                    onError={(e) => {
                                                        e.target.src = '/assets/img/product-default.jpg';
                                                    }}
                                                />
                                                {message.product.discount > 0 && (
                                                    <span className="product-discount-badge">
                                                        -{message.product.discount}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="product-card-info">
                                                <h4 className="product-card-name">{message.product.name}</h4>
                                                <div className="product-card-price">
                                                    {message.product.discount > 0 ? (
                                                        <>
                                                            <span className="price-original">
                                                                {formatCurrency(message.product.price)}
                                                            </span>
                                                            <span className="price-sale">
                                                                {formatCurrency(message.product.price * (1 - message.product.discount / 100))}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="price-sale">
                                                            {formatCurrency(message.product.price)}
                                                        </span>
                                                    )}
                                                </div>
                                                {message.product.sold > 0 && (
                                                    <div className="product-card-sold">
                                                        Đã bán: {message.product.sold}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Text Message
                                    <div className={`message ${message.type}`}>
                                        {message.type === 'bot' && (
                                            <div className="message-avatar">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                                </svg>
                                            </div>
                                        )}
                                        <div className="message-content">
                                            <div className="message-bubble">
                                                {message.text.split('\n').map((line, i) => (
                                                    <React.Fragment key={i}>
                                                        {line}
                                                        {i < message.text.split('\n').length - 1 && <br />}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            {message.action && (
                                                <button 
                                                    className="message-action-btn"
                                                    onClick={() => handleActionClick(message.action)}
                                                >
                                                    {message.action === 'view_orders' && '📦 Xem đơn hàng của tôi'}
                                                </button>
                                            )}
                                            <span className="message-time">
                                                {message.timestamp.toLocaleTimeString('vi-VN', { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="message bot">
                                <div className="message-avatar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                </div>
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {messages.length <= 1 && (
                        <div className="chatbot-quick-replies">
                            {quickReplies.map((reply, index) => (
                                <button
                                    key={index}
                                    className="quick-reply-btn"
                                    onClick={() => handleQuickReply(reply)}
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="chatbot-input-container">
                        <input
                            type="text"
                            className="chatbot-input"
                            placeholder="Nhập tin nhắn..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button 
                            className="chatbot-send-btn"
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
