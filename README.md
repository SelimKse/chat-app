# Chat App

Multi-platform (Web, Mobile, Desktop) gerçek zamanlı sohbet uygulaması.

## 📦 Proje Yapısı

```
chat-app/
├── backend/              # Node.js + Express + Socket.IO
│   ├── config/          # Database, Socket.IO config
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   ├── constants/       # Error codes, constants
│   ├── Dockerfile       # Backend container
│   ├── .env.example     # Environment template
│   └── README.md        # Backend docs
├── frontend/            # React Web App (TBD)
├── mobile/              # React Native App (TBD)
├── docker/              # Docker utils (TBD)
├── docker-compose.yml   # Container orchestration
├── .env.example         # Root env template
└── README.md            # This file
```

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler
- Node.js 18+ 
- MongoDB (local veya MongoDB Atlas)
- Docker & Docker Compose (opsiyonel)
- npm veya yarn

### 1. Repository'yi Clone Et
```bash
git clone https://github.com/yourusername/chat-app.git
cd chat-app
```

### 2. Backend Kurulumu

```bash
cd backend
cp .env.example .env
# .env dosyasını düzenle
npm install
npm run dev
```

Backend şu adrestte çalışacak: `http://localhost:5000`

### 3. Health Check
```bash
curl http://localhost:5000/health
```

## 🐳 Docker ile Başlangıç

### Tüm Servisleri Başlat
```bash
docker-compose up -d
```

### Servisleri Kontrol Et
```bash
docker-compose ps
```

### Logları Görüntüle
```bash
docker-compose logs -f backend
docker-compose logs -f mongodb
```

### Servisleri Durdur
```bash
docker-compose down
```

## 🔌 API Endpoints

### Health Check
```
GET /health
```

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
GET    /api/auth/verify-code
```

### Chat
```
POST   /api/chat/create           # Chat oluştur
GET    /api/chat                  # Tüm chat'leri getir
GET    /api/chat/:chatId          # Chat detaylarını getir
DELETE /api/chat/:chatId          # Chat sil

POST   /api/chat/:chatId/messages              # Mesaj gönder
GET    /api/chat/:chatId/messages              # Mesajları getir
PUT    /api/chat/:chatId/messages/:messageId   # Mesajı düzenle
DELETE /api/chat/:chatId/messages/:messageId   # Mesajı sil
POST   /api/chat/:chatId/messages/:messageId/read  # Okundu işaretle
```

## 🔐 Environment Variables

Tüm gerekli değişkenler `.env.example` dosyasında bulunmaktadır.

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/chat-app

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev    # Development mode (nodemon)
npm start      # Production mode
npm test       # Tests (eğer var ise)
```

### Dosya Yapısı
- `server.js` - Ana sunucu dosyası
- `config/` - Konfigürasyonlar
- `controllers/` - İş mantığı
- `models/` - Veri modelleri
- `routes/` - API rotaları
- `middleware/` - Custom middleware'ler

## 📚 Dökümentasyon

- [Backend README](./backend/README.md) - Backend detaylı dokümantasyon
- [API Documentation](./docs/API.md) - (TBD) - API endpoint detayları
- [Database Schema](./docs/SCHEMA.md) - (TBD) - MongoDB şemaları

## 🔄 WebSocket Events

### Server → Client
- `user:online` - Kullanıcı online oldu
- `user:offline` - Kullanıcı offline oldu
- `message:new` - Yeni mesaj
- `message:edited` - Mesaj düzenlendi
- `message:deleted` - Mesaj silindi
- `typing:start` - Kullanıcı yazıyor
- `typing:stop` - Yazma durduruldu

### Client → Server
- `message:send` - Mesaj gönder
- `message:edit` - Mesajı düzenle
- `message:delete` - Mesajı sil
- `typing:start` - Yazma başla
- `typing:stop` - Yazma bitir

## 🐛 Troubleshooting

### MongoDB Bağlantısı Başarısız
```
Çözüm: MongoDB'nin çalışıp çalışmadığını kontrol et
$ mongosh  # Bağlantı test et
```

### Port Zaten Kullanımda
```bash
# Farklı port kullan
PORT=5001 npm run dev
```

### Docker İçinden MongoDB'ye Bağlanamıyor
```bash
# docker-compose.yml'daki URI kontrol et
MONGO_URI=mongodb://root:rootpassword@mongodb:27017/chat-app?authSource=admin
```

## 📝 License

MIT

## 👥 Katkıda Bulunma

Katkılar hoş karşılanır! Lütfen:
1. Bu repository'yi fork et
2. Feature branch oluştur (`git checkout -b feature/AmazingFeature`)
3. Değişikleri commit et (`git commit -m 'Add AmazingFeature'`)
4. Branch'e push et (`git push origin feature/AmazingFeature`)
5. Pull Request aç

## 📧 İletişim

Sorular veya öneriler için:
- GitHub Issues: [Issues](https://github.com/yourusername/chat-app/issues)
- Email: your-email@example.com

---

**Son Güncelleme:** 8 Nisan 2026
