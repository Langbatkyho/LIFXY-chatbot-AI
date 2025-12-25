import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';

const ChatWidget = ({ apiUrl = 'https://lifxy-chatbot-api.onrender.com' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/history/${sessionId}?limit=10`);
      const data = await response.json();
      if (data.history) {
        const formattedMessages = [];
        data.history.forEach(msg => {
          formattedMessages.push({
            type: 'user',
            content: msg.user_message,
            timestamp: new Date(msg.created_at),
          });
          formattedMessages.push({
            type: 'bot',
            content: msg.bot_response,
            products: msg.referenced_products,
            timestamp: new Date(msg.created_at),
          });
        });
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message to UI
    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId: sessionId,
          customerName: 'Guest',
          customerEmail: null,
        }),
      });

      const data = await response.json();

      if (data.response) {
        const botMessage = {
          type: 'bot',
          content: data.response,
          products: data.referencedProducts,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'bot',
        content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          className="chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Mở chatbot"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="chat-widget">
          {/* Header */}
          <div className="chat-header">
            <h3>CarMate Assistant</h3>
            <p className="chat-subtitle">Hỗ trợ bằng Gemini AI</p>
            <button
              className="chat-close-btn"
              onClick={() => setIsOpen(false)}
              title="Đóng chatbot"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <h4>Chào mừng đến với CarMate!</h4>
                <p>Hỏi tôi về sản phẩm, giá cả, hoặc bất kỳ điều gì bạn muốn biết về xe.</p>
                <div className="chat-suggestions">
                  <button onClick={() => setInput('Tôi cần lốp xe nào?')}>
                    Lốp xe tốt
                  </button>
                  <button onClick={() => setInput('Có khuyến mãi nào không?')}>
                    Khuyến mãi
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.type}`}>
                  <div className="message-content">
                    {msg.content}
                  </div>
                  {msg.products && msg.products.length > 0 && (
                    <div className="message-products">
                      {msg.products.map((product, pidx) => (
                        <div key={pidx} className="product-item">
                          <span className="product-name">{product.title}</span>
                          <span className="product-price">{product.price.toLocaleString()}đ</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            {loading && (
              <div className="chat-message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
              title="Gửi"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

          <div className="chat-footer">
            <p>Powered by Gemini AI</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
