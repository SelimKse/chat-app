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
          Demo iste
        </a>
      </header>

      <main className="landing-main" id="baslangic">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <HeroBadge>Türkçe başlangıç sayfası</HeroBadge>
              <HeroBadge>Layout-first mimari</HeroBadge>
            </div>

            <h1>Mesajlaşma ürününü sade, güçlü ve Türkçe bir girişle başlat.</h1>

            <p className="landing-lead">
              SohbetKök, kullanıcıyı ilk saniyede yakalayan, mobilde temiz duran
              ve sonrasında auth ile chat ekranlarına doğal şekilde açılan bir
              ana sayfa ile başlar.
            </p>

            <div className="landing-actions">
              <a className="landing-cta" href="#iletisim">
                Hemen başla
              </a>
              <a className="landing-cta landing-cta-secondary" href="#ozellikler">
                Özellikleri gör
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
                <strong>Türkçe karşılama alanı</strong>
                <p>
                  Bu alan daha sonra giriş, kayıt ve sohbet akışlarına açılan
                  ana köprü olacak.
                </p>

                <div className="mock-list">
                  <div>
                    <span>Durum</span>
                    <strong>Hazır</strong>
                  </div>
                  <div>
                    <span>Yön</span>
                    <strong>Chat odaklı</strong>
                  </div>
                  <div>
                    <span>Stil</span>
                    <strong>Modern ve temiz</strong>
                  </div>
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

        <section className="landing-grid" id="ozellikler">
          {landing.features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </section>

        <section className="landing-split" id="akış">
          <SectionCard eyebrow="Nasıl ilerliyoruz" title="İlk sürüm akışı">
            <ol className="landing-steps">
              {landing.steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard eyebrow="Güven" title="Neden bu yapı doğru">
            <ul className="landing-trust">
              {landing.trustPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        </section>

        <section className="landing-footer-card" id="iletisim">
          <div>
            <p className="section-eyebrow">İletişim / başlangıç</p>
            <h2>Bir sonraki adım: auth ekranı ve ilk gerçek kullanıcı akışı.</h2>
          </div>

          <a className="landing-cta" href="#baslangic">
            Yukarı dön
          </a>
        </section>
      </main>
    </div>
  )
}

export default LandingPage