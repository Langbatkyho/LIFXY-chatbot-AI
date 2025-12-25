/**
 * CarMate Chatbot Widget - Embed Script
 * 
 * Hướng dẫn sử dụng:
 * 1. Thêm script tag này vào cuối thẻ <body> trên website
 * 2. Customize apiUrl nếu cần
 * 
 * Ví dụ:
 * <script src="https://carmate.myharavan.com/chatbot.js"></script>
 * hoặc
 * <script>
 *   window.CarMateChat = {
 *     apiUrl: 'https://lifxy-chatbot-api.onrender.com',
 *     theme: 'light'
 *   };
 * </script>
 * <script src="https://carmate.myharavan.com/chatbot.js"></script>
 */

(function() {
  // Configuration
  const config = {
    apiUrl: window.CarMateChat?.apiUrl || 'https://lifxy-chatbot-api.onrender.com',
    theme: window.CarMateChat?.theme || 'light',
  };

  // Create container
  const container = document.createElement('div');
  container.id = 'carmate-chatbot-root';
  document.body.appendChild(container);

  // Load CSS
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://carmate.myharavan.com/ChatWidget.css';
  document.head.appendChild(style);

  // Load and render React component (if using React)
  // Or use vanilla JS version below

  // Vanilla JS Implementation
  class CarMateChatbot {
    constructor(apiUrl) {
      this.apiUrl = apiUrl;
      this.isOpen = false;
      this.messages = [];
      this.sessionId = this.generateSessionId();
      this.container = document.getElementById('carmate-chatbot-root');
      this.render();
      this.attachEventListeners();
    }

    generateSessionId() {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    render() {
      // Toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'chat-toggle-btn';
      toggleBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      `;
      toggleBtn.onclick = () => this.toggle();
      this.container.appendChild(toggleBtn);

      // Chat widget
      const widget = document.createElement('div');
      widget.id = 'chat-widget';
      widget.className = 'chat-widget';
      widget.style.display = 'none';
      widget.innerHTML = `
        <div class="chat-header">
          <h3>CarMate Assistant</h3>
          <p class="chat-subtitle">Hỗ trợ bằng Gemini AI</p>
          <button class="chat-close-btn">✕</button>
        </div>
        <div class="chat-messages"></div>
        <form class="chat-input-form">
          <input type="text" class="chat-input" placeholder="Nhập câu hỏi...">
          <button type="submit" class="chat-send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
        <div class="chat-footer">
          <p>Powered by Gemini AI</p>
        </div>
      `;
      this.container.appendChild(widget);

      this.widget = widget;
      this.messagesContainer = widget.querySelector('.chat-messages');
      this.inputForm = widget.querySelector('.chat-input-form');
      this.input = widget.querySelector('.chat-input');
      this.closeBtn = widget.querySelector('.chat-close-btn');

      this.attachFormListener();
      this.attachCloseListener();
      this.showWelcomeMessage();
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      this.isOpen = true;
      this.widget.style.display = 'flex';
      this.input.focus();
    }

    close() {
      this.isOpen = false;
      this.widget.style.display = 'none';
    }

    showWelcomeMessage() {
      const welcome = document.createElement('div');
      welcome.className = 'chat-welcome';
      welcome.innerHTML = `
        <h4>Chào mừng đến với CarMate!</h4>
        <p>Hỏi tôi về sản phẩm, giá cả, hoặc bất kỳ điều gì bạn muốn biết về xe.</p>
        <div class="chat-suggestions">
          <button type="button">Lốp xe tốt</button>
          <button type="button">Khuyến mãi</button>
        </div>
      `;

      this.messagesContainer.innerHTML = '';
      this.messagesContainer.appendChild(welcome);

      welcome.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => this.sendMessage(btn.textContent);
      });
    }

    attachFormListener() {
      this.inputForm.onsubmit = (e) => {
        e.preventDefault();
        const message = this.input.value.trim();
        if (message) {
          this.sendMessage(message);
          this.input.value = '';
        }
      };
    }

    attachCloseListener() {
      this.closeBtn.onclick = () => this.close();
    }

    attachEventListeners() {
      // Already handled in attachFormListener and attachCloseListener
    }

    addMessage(type, content, products = null) {
      const messageEl = document.createElement('div');
      messageEl.className = `chat-message ${type}`;

      const contentEl = document.createElement('div');
      contentEl.className = 'message-content';
      contentEl.textContent = content;

      messageEl.appendChild(contentEl);

      if (products && products.length > 0) {
        const productsEl = document.createElement('div');
        productsEl.className = 'message-products';
        products.forEach(product => {
          const productEl = document.createElement('div');
          productEl.className = 'product-item';
          productEl.innerHTML = `
            <span class="product-name">${product.title}</span>
            <span class="product-price">${product.price.toLocaleString()}đ</span>
          `;
          productsEl.appendChild(productEl);
        });
        messageEl.appendChild(productsEl);
      }

      const timeEl = document.createElement('span');
      timeEl.className = 'message-time';
      timeEl.textContent = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      messageEl.appendChild(timeEl);

      // Clear welcome if first message
      if (this.messagesContainer.querySelector('.chat-welcome')) {
        this.messagesContainer.innerHTML = '';
      }

      this.messagesContainer.appendChild(messageEl);
      this.scrollToBottom();
    }

    showLoading() {
      const loader = document.createElement('div');
      loader.className = 'chat-message bot';
      loader.innerHTML = `
        <div class="message-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      this.messagesContainer.appendChild(loader);
      this.scrollToBottom();
      return loader;
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async sendMessage(message) {
      try {
        this.addMessage('user', message);

        const loaderEl = this.showLoading();

        const response = await fetch(`${this.apiUrl}/api/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            sessionId: this.sessionId,
            customerName: 'Guest',
          }),
        });

        loaderEl.remove();

        const data = await response.json();

        if (data.response) {
          this.addMessage('bot', data.response, data.referencedProducts);
        } else {
          this.addMessage('bot', 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('Error sending message:', error);
        this.addMessage('bot', 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new CarMateChatbot(config.apiUrl);
    });
  } else {
    new CarMateChatbot(config.apiUrl);
  }
})();
