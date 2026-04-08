# Chat App Backend

Express.js tabanlı chat uygulaması backend servisi. Socket.IO ile real-time iletişim, MongoDB ile veri depolama.

## 📋 Özellikler

- ✅ JWT tabanlı authentication (Token + Refresh Token)
- ✅ Real-time mesajlaşma (Socket.IO)
- ✅ Email ve SMS yapılandırması (Nodemailer + Twilio)
- ✅ Security code (OTP) sistemi
- ✅ Morgan logger
- ✅ Helmet güvenlik middleware'i
- ✅ Global error handler
- ✅ Request validation
- ✅ MongoDB entegrasyonu

## 🚀 Kurulum

### 1. Dependencies Yükle
```bash
npm install
```

### 2. Environment Değişkenlerini Ayarla
```bash
cp .env.example .env
```

`.env` dosyasını düzenle:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/chat-app

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@chat-app.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Database Bağlantısını Kontrol Et
MongoDB'nin çalıştığından emin ol:
```bash
# Local MongoDB başlatmak için (Windows)
mongod

# Veya cloud MongoDB kullan (MongoDB Atlas)
```

## 📡 Sunucuyu Başlat

### Development (Hot Reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

Server `http://localhost:5000` adresinde çalışacak

## 🔍 API Endpoints

### Health Check
```
GET http://localhost:5000/health
```

### Auth Endpoints
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
GET /api/auth/verify-code
...
```

## 🔌 Socket.IO Events

### Server Emits
- `user:online` - Kullanıcı online olduğunda
- `user:offline` - Kullanıcı offline olduğunda
- `message:new` - Yeni mesaj
- `message:edited` - Mesaj düzenlendi
- `message:deleted` - Mesaj silindi

### Client Emits
- `message:send` - Mesaj gönder
- `message:edit` - Mesaj düzenle
- `message:delete` - Mesaj sil
- `typing:start` - Yazma başlandı
- `typing:stop` - Yazma durduruldu

## 📁 Proje Yapısı

```
backend/
├── config/           # Konfigürasyon dosyaları
│   ├── database.js   # MongoDB bağlantısı
│   └── socket.js     # Socket.IO setup
├── controllers/      # Request handlers
├── middleware/       # Custom middleware'ler
│   ├── auth.js       # JWT doğrulama
│   ├── errorHandler.js
│   ├── logger.js
│   └── validation.js
├── models/          # MongoDB şemaları
├── routes/          # API rotaları
├── utils/           # Yardımcı fonksiyonlar
├── constants/       # Sabitler ve hata kodları
├── .env.example     # Environment template
└── server.js        # Ana sunucu dosyası
```

## 🔐 Security

- ✅ Helmet: HTTP başlıkları güvenliği
- ✅ CORS: Cross-origin kontrol
- ✅ JWT: Token-based authentication
- ✅ Password Hashing: Bcrypt
- ✅ Input Validation: JSON ve body kontrolü

## 📝 Notlar

- `validateJSON`: POST/PUT/PATCH için `Content-Type: application/json` zorunlu
- `validateNotEmpty`: Body boş olamaz
- Morgan logger otomatik olarak tüm request'leri kaydeder
- Socket.IO token doğrulama gerekiyor

## 🐛 Troubleshooting

### MongoDB bağlantısı başarısız
- MongoDB'nin çalıştığını kontrol et
- `MONGO_URI` değerini doğrula

### Socket.IO hataları
- Token'ın doğru formatında olduğunu kontrol et
- CORS ayarlarını doğrula

### SMTP hataları
- Gmail için app password kullan (2FA gerekli)
- Firewall kurallarını kontrol et

## 👨‍💻 Geliştirme

```bash
# Development modunda çalıştır (nodemon ile hot reload)
npm run dev

# Production ortamında çalıştır
npm start

# Health endpoint'i test et
curl http://localhost:5000/health
```

## 📄 Lisans

MIT
