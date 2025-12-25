# CarMate Chatbot - Frontend Widget

Widget nhúng chatbot Gemini AI vào website CarMate (carmate.myharavan.com)

## Files

- **ChatWidget.jsx** - React component (optional, for React-based projects)
- **ChatWidget.css** - Styles cho widget
- **chatbot.js** - Vanilla JavaScript implementation (recommended)

## Installation

### Option 1: Vanilla JavaScript (Recommended)

Thêm script tag vào cuối thẻ `<body>` của website:

```html
<script src="https://lifxy-chatbot-widget.vercel.app/chatbot.js"></script>
```

Hoặc host locally:

```html
<script src="/path/to/chatbot.js"></script>
```

### Option 2: React Component

Nếu website sử dụng React:

```jsx
import ChatWidget from '@/components/ChatWidget';

function App() {
  return (
    <>
      <YourAppContent />
      <ChatWidget apiUrl="https://lifxy-chatbot-api.onrender.com" />
    </>
  );
}
```

## Configuration

### Vanilla JS

Customize trước khi load script:

```html
<script>
  window.CarMateChat = {
    apiUrl: 'https://lifxy-chatbot-api.onrender.com',
    theme: 'light'
  };
</script>
<script src="/chatbot.js"></script>
```

### React

```jsx
<ChatWidget 
  apiUrl="https://your-api-url.com"
/>
```

## Features

✅ **Floating Chat Button** - Nổi trên trang web  
✅ **Auto Scroll** - Tự cuộn đến tin nhắn mới  
✅ **Chat History** - Lưu lịch sử theo session  
✅ **Product References** - Hiển thị sản phẩm liên quan  
✅ **Typing Indicator** - Hiệu ứng đang gõ  
✅ **Responsive Design** - Tương thích mobile  
✅ **Smooth Animations** - Hiệu ứng mượt mà  

## Usage Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CarMate - Automotive Store</title>
</head>
<body>
  <!-- Your website content -->
  <header>CarMate - Nơi mua sắm phụ tùng ô tô</header>
  <main>
    <!-- Products, etc -->
  </main>

  <!-- Add chatbot widget -->
  <script>
    window.CarMateChat = {
      apiUrl: 'https://lifxy-chatbot-api.onrender.com'
    };
  </script>
  <script src="https://your-domain.com/chatbot.js"></script>
</body>
</html>
```

## Styling Customization

Modify CSS variables:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --text-color: #333;
  --border-color: #ddd;
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Android Chrome)

## Performance

- **Bundle size**: ~15KB (gzipped)
- **Load time**: <100ms
- **DOM impact**: 1 div container + styles
- **Network requests**: Only on user interaction

## Security

- ✅ CORS enabled on API
- ✅ Session-based chat
- ✅ No sensitive data in localStorage
- ✅ API key protected in backend

## Troubleshooting

### Widget không hiển thị
```javascript
// Check if container exists
console.log(document.getElementById('carmate-chatbot-root'));

// Check if CSS loaded
console.log(document.styleSheets);

// Check API connection
fetch('https://lifxy-chatbot-api.onrender.com/health')
  .then(r => r.json())
  .then(console.log);
```

### Messages không gửi
```javascript
// Check API endpoint
// Verify sessionId is generated
console.log(sessionStorage.getItem('carmate_session'));

// Check network in DevTools -> Network tab
```

## Advanced Usage

### Custom Branding

Modify `chatbot.js`:

```javascript
const config = {
  title: 'CarMate Support',
  subtitle: 'Powered by AI',
  placeholder: 'Ask me anything...',
  theme: 'dark'
};
```

### API Customization

```javascript
const chatbot = new CarMateChatbot(apiUrl);
chatbot.sendMessage('Custom message');
chatbot.addMessage('bot', 'Custom response');
```

## Deployment

### Host on Vercel

```bash
# Create vercel.json
{
  "rewrites": [
    {
      "source": "/chatbot.js",
      "destination": "/chatbot.js"
    }
  ]
}
```

### Host on Netlify

```bash
npm run build
# Upload dist folder
```

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Create widget files
3. 📋 Host widget on CDN
4. 📋 Embed into CarMate website
5. 📋 Setup analytics

---

**Made with ❤️ for CarMate**
