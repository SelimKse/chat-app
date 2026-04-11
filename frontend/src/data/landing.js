export const landing = {
  brand: 'SohbetKök',
  navigation: [
    { label: 'Ürün', href: '#urun' },
    { label: 'Özellikler', href: '#ozellikler' },
    { label: 'Güvenlik', href: '#guvenlik' },
    { label: 'İletişim', href: '#iletisim' },
  ],
  highlights: [
    'Türkçe ürün dili',
    'Hızlı mesaj akışı',
    'Modern arayüz',
    'Katmanlı güvenlik',
  ],
  stats: [
    { label: 'Mesaj akışı', value: 'Anlık', note: 'Gerçek zamanlı iletişim hissi' },
    { label: 'Dil', value: 'TR', note: 'Türkçe ürün dili ve mikro metinler' },
    { label: 'Deneyim', value: 'Temiz', note: 'Sade ama dikkat çekici arayüz' },
    { label: 'Koruma', value: 'Yüksek', note: 'Oturum ve veri güvenliği odağı' },
  ],
  features: [
    {
      title: 'Sohbeti hızlı başlatır',
      detail:
        'Kullanıcı ilk bakışta ne yapacağını anlar, karmaşa olmadan doğrudan sohbete geçer.',
    },
    {
      title: 'Türkçe ve net bir ürün dili taşır',
      detail:
        'Mikro metinler, butonlar ve başlıklar yerel kullanım alışkanlıklarına göre sade tutulur.',
    },
    {
      title: 'Mobilde de akıcı kalır',
      detail:
        'Kart yapısı ve boşluk sistemi küçük ekranlarda da anlaşılır ve dengeli görünür.',
    },
    {
      title: 'Canlı his veren yapı kurar',
      detail:
        'Hafif geçişler ve katmanlı yüzeyler ürünün statik değil, yaşayan bir deneyim olduğunu hissettirir.',
    },
  ],
  security: [
    {
      title: 'Oturum kontrolü',
      detail: 'Giriş ve token akışları güvenli sınırlar içinde tutulur.',
    },
    {
      title: 'Veri koruma',
      detail: 'Mesaj ve kullanıcı verileri yetki katmanlarına göre ayrılır.',
    },
    {
      title: 'Rate limit ve denetim',
      detail: 'Saldırı, spam ve gereksiz istekleri azaltan koruma mantığı vardır.',
    },
    {
      title: 'Sürüm disiplini',
      detail: 'Her güncelleme küçük parçalara ayrılır ve kontrollü şekilde yayınlanır.',
    },
  ],
}