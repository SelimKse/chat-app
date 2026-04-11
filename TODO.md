# Chat App Roadmap

## Çalışma Prensibi

- [ ] Component sistemi korunacak, sayfa mantığı layout üzerinden kurulacak.
- [ ] Ortak UI parçaları tek yerde toplanacak, tekrar eden kod kopyalanmayacak.
- [ ] Her yeni iş küçük, test edilebilir ve tek commitlik ilerleyecek.
- [ ] Her tamamlanan aşama GitHub'a güncelleme olarak pushlanacak.
- [ ] Büyük değişikliklerden önce küçük bir iskelet kurulup sonra detaylandırılacak.

## Backend Yol Haritası

### 1. Güvenlik ve Temel Sağlık

- [x] Secrets ve env temizliği
- [x] CI ve kalite kapısını geri açma
- [x] Duplicate index temizliği
- [ ] Production secret yönetimi planı
- [ ] Rate limit eşiklerini gerçek trafikle tekrar ayarlama
- [ ] Session / token iptal stratejisi
- [ ] Audit log yapısı

### 2. Auth ve Kullanıcı Akışı

- [ ] Register / login akışını production sertliğinde netleştirme
- [ ] Refresh token yaşam döngüsü
- [ ] 2FA akışını sadeleştirme ve güçlendirme
- [ ] Şifre sıfırlama / doğrulama akışlarını tamamlama
- [ ] Kullanıcı silme ve veri dışa aktarma
- [ ] Cihaz bazlı oturum takibi

### 3. Chat Çekirdeği

- [ ] Sohbet listeleme performansını iyileştirme
- [ ] Son mesaj ve unread count modelini netleştirme
- [ ] Okundu / teslim edildi / yazıyor durumlarını standardize etme
- [ ] Mesaj düzenleme ve silme geçmişi
- [ ] Grup sohbet akışı ve participant yönetimi
- [ ] Mesaj arama endpointleri

### 4. Medya ve Dosya

- [ ] Upload akışını storage abstraction ile ayırma
- [ ] CDN / object storage planı
- [ ] Signed URL veya presigned upload modeli
- [ ] Thumbnail ve mime policy
- [ ] Virüs tarama ve güvenlik kuralları

### 5. Gözlemlenebilirlik

- [ ] Structured logging standardı
- [ ] Request id, correlation id ve trace alanları
- [ ] Metrik kapsamını genişletme
- [ ] Alarm / uyarı eşikleri
- [ ] Hata raporlama standardı

### 6. Moderasyon ve Abuse

- [ ] Ban / restriction akışlarını genişletme
- [ ] Spam, flood ve toxic davranış skorlaması
- [ ] Admin aksiyon geçmişi
- [ ] Raporlama ve delil saklama
- [ ] Otomatik uyarı / auto-moderation taslağı

## Frontend Yol Haritası

### 1. Mimari Temel

- [ ] Vite tabanlı iskeleti tamamlamak
- [ ] Component klasör yapısını netleştirmek
- [ ] Layout-first mimariyi kurmak
- [ ] Routing stratejisini belirlemek
- [ ] API client katmanını oluşturmak

### 2. Tasarım Sistemi

- [ ] Renk paleti, tipografi ve spacing tokenları
- [ ] Buton, input, modal, toast, badge, avatar bileşenleri
- [ ] Form standardı ve validation patterni
- [ ] Responsive breakpoints
- [ ] Dark / light tema kararı

### 3. Layout Sistemi

- [ ] Auth layout
- [ ] App shell layout
- [ ] Chat layout
- [ ] Admin layout
- [ ] Responsive sidebar ve topbar davranışı
- [ ] Mobil navigation patterni

### 4. Component Sistemi

- [ ] Atomic UI parçaları
- [ ] Composite chat bileşenleri
- [ ] Message bubble, chat list item, typing indicator
- [ ] User presence ve unread badge bileşenleri
- [ ] File preview ve attachment card

### 5. Ekranlar

- [x] Landing / giriş ekranı
- [ ] Login / register ekranları
- [ ] OTP / verification ekranları
- [ ] Chat listesi
- [ ] Chat detail ekranı
- [ ] Profil / settings ekranı
- [ ] Admin destek paneli

### 6. State ve Realtime

- [ ] Auth state yönetimi
- [ ] Chat state yönetimi
- [ ] Socket bağlantı yaşam döngüsü
- [ ] Typing, read receipt ve presence olayları
- [ ] Optimistic UI yaklaşımı
- [ ] Cache / invalidation stratejisi

### 7. UX ve Kalite

- [ ] Loading / empty / error state standardı
- [ ] Skeleton component seti
- [ ] Keyboard shortcut desteği
- [ ] Accessibility kontrolü
- [ ] Animasyon ve geçiş standardı
- [ ] Mobile-first son kontrol

## DevOps ve Yayın

- [ ] Backend ve frontend için ayrı environment standardı
- [ ] GitHub update rutini: her tamamlanan adım pushlanacak
- [ ] Release notu formatı
- [ ] Staging / production ayrımı
- [ ] Basit deploy checklist
- [ ] Smoke test checklist

## Bu Haftanın Önceliği

- [ ] Frontend component/layout iskeletini kurmak
- [ ] Auth ekranlarının temelini atmak
- [ ] Backend kalite hattını korumak
- [ ] API client ve route yapısını bağlamak
- [ ] İlk gerçek chat shell ekranını çıkarmak
