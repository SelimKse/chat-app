import FeatureCard from '../components/FeatureCard'
import HeroBadge from '../components/HeroBadge'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import { landing } from '../data/landing'

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-orb landing-orb-left" aria-hidden="true" />
      <div className="landing-orb landing-orb-right" aria-hidden="true" />

      <header className="landing-header">
        <a className="landing-brand" href="#baslangic">
          <span className="landing-brand-mark">SK</span>
          <span>{landing.brand}</span>
        </a>

        <nav className="landing-nav" aria-label="Ana menü">
          {landing.navigation.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="landing-cta landing-cta-ghost" href="#iletisim">
          Ürün tanıtımı
        </a>
      </header>

      <main className="landing-main" id="baslangic">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <HeroBadge>Türkçe ürün sayfası</HeroBadge>
              <HeroBadge>Chat odaklı platform</HeroBadge>
              <HeroBadge>Güvenlik öncelikli</HeroBadge>
            </div>

            <h1>Hızlı, güvenli ve Türkçe bir sohbet ürünü için canlı bir vitrin.</h1>

            <p className="landing-lead">
              SohbetKök; sohbet akışını hızlı başlatan, güvenliği görünür kılan
              ve ürünün karakterini ilk ekranda hissettiren modern bir chat
              platformudur. Bu sayfa, ürünü kısa ama etkili biçimde anlatır.
            </p>

            <div className="landing-actions">
              <a className="landing-cta" href="#iletisim">
                Ürünü keşfet
              </a>
              <a className="landing-cta landing-cta-secondary" href="#ozellikler">
                Özelliklere bak
              </a>
            </div>

            <div className="landing-highlight-row" aria-label="Öne çıkanlar">
              {landing.highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="landing-hero-panel" aria-label="Ürün önizlemesi">
            <div className="mock-window">
              <div className="mock-topbar">
                <span />
                <span />
                <span />
              </div>

              <div className="mock-content">
                <p className="mock-label">Canlı görünüm</p>
                <strong>Chat ürünü ön izlemesi</strong>
                <p>
                  Katmanlı kartlar, hareketli yüzeyler ve net kontrast ile ürün
                  hissi daha ilk anda verir.
                </p>

                <div className="mock-list">
                  <div>
                    <span>Deneyim</span>
                    <strong>Canlı</strong>
                  </div>
                  <div>
                    <span>Odak</span>
                    <strong>Mesajlaşma</strong>
                  </div>
                  <div>
                    <span>Güvenlik</span>
                    <strong>Yerleşik koruma</strong>
                  </div>
                </div>

                <div className="mock-pulse-row" aria-label="Ürün sinyalleri">
                  <span>Kısa gecikme</span>
                  <span>Net okuma</span>
                  <span>Güvenli oturum</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Kısa özet">
          {landing.stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <section className="landing-split" id="urun">
          <SectionCard eyebrow="Ürün" title="SohbetKök ne sunuyor?">
            <p className="landing-copy-block">
              Mesajlaşma, topluluk ve hızlı iletişim akışlarını tek yerde
              toplayan, sade ama güçlü bir kullanıcı deneyimi sunuyoruz. Tasarım
              dili anlaşılır, yapı ise büyümeye hazır.
            </p>
          </SectionCard>

          <SectionCard eyebrow="Güvenlik" title="Üründe güven nasıl hissedilir?">
            <ul className="landing-security-list">
              {landing.security.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </section>

        <section className="landing-grid" id="ozellikler">
          {landing.features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </section>

        <section className="landing-split" id="guvenlik">
          <SectionCard eyebrow="Güvenlik" title="Korumayı ürünün içine yerleştirdik">
            <div className="landing-security-grid">
              {landing.security.map((item) => (
                <article key={item.title} className="security-card">
                  <span />
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Ürün tonu" title="Neden bu sayfa farklı hissedilir?">
            <ul className="landing-trust">
              <li>Tekrar eden kurumsal kalıplar yerine canlı yüzeyler</li>
              <li>Görsel hiyerarşi ile kısa sürede ikna eden akış</li>
              <li>Türkçe, net ve ürüne odaklı mikro metinler</li>
              <li>Animasyonla desteklenen hafif ama güçlü arayüz</li>
            </ul>
          </SectionCard>
        </section>

        <section className="landing-footer-card" id="iletisim">
          <div>
            <p className="section-eyebrow">İletişim / erken erişim</p>
            <h2>İstersen bir sonraki adımda giriş ve kayıt ekranlarını da aynı tonda kurarız.</h2>
          </div>

          <a className="landing-cta" href="#baslangic">
            Yukarı çık
          </a>
        </section>
      </main>
    </div>
  )
}

export default LandingPage