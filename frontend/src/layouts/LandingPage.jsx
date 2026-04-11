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
          Erken erişim al
        </a>
      </header>

      <main className="landing-main" id="baslangic">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <HeroBadge>Türkçe ürün sayfası</HeroBadge>
              <HeroBadge>Chat odaklı platform</HeroBadge>
            </div>

            <h1>Sohbet deneyimini tanıtan, net ve güven veren bir giriş sayfası.</h1>

            <p className="landing-lead">
              SohbetKök; ekipler, topluluklar ve hızlı iletişim kurmak isteyen
              kullanıcılar için tasarlanmış modern bir sohbet ürünüdür. Bu
              sayfa, ürünü kısa ve anlaşılır şekilde tanıtır, ziyaretçiyi doğru
              aksiyona yönlendirir.
            </p>

            <div className="landing-actions">
              <a className="landing-cta" href="#iletisim">
                Ürünü keşfet
              </a>
              <a className="landing-cta landing-cta-secondary" href="#ozellikler">
                Neler sunduğunu gör
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

        <section className="landing-split" id="urun">
          <SectionCard eyebrow="Ürün" title="SohbetKök ne sunuyor?">
            <p className="landing-copy-block">
              Mesajlaşma, topluluk ve hızlı iletişim akışlarını tek yerde
              toplayan, sade ama etkili bir kullanıcı deneyimi sunuyoruz.
              Tasarım dili anlaşılır, yapı ise büyümeye hazır.
            </p>
          </SectionCard>

          <SectionCard eyebrow="Kimler için" title="Bu ürün kimlere uygun?">
            <ul className="landing-trust">
              <li>Ekip içi hızlı iletişim isteyenler</li>
              <li>Topluluk ve grup sohbeti yönetenler</li>
              <li>Türkçe, net ve modern bir chat deneyimi arayanlar</li>
              <li>Kontrollü şekilde büyüyen bir ürün isteyen ekipler</li>
            </ul>
          </SectionCard>
        </section>

        <section className="landing-grid" id="ozellikler">
          {landing.features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </section>

        <section className="landing-split" id="akış">
          <SectionCard eyebrow="Nasıl çalışır" title="Kullanıcı akışı">
            <ol className="landing-steps">
              {landing.steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard eyebrow="Güven" title="Neden bu ürün dikkat çeker">
            <ul className="landing-trust">
              {landing.trustPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        </section>

        <section className="landing-footer-card" id="iletisim">
          <div>
            <p className="section-eyebrow">İletişim / erken erişim</p>
            <h2>İstersen bir sonraki adımda kayıt ve giriş sayfalarını aynı dilde kurarız.</h2>
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