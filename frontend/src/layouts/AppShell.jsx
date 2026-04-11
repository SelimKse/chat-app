import SectionCard from '../components/SectionCard'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import TimelineItem from '../components/TimelineItem'

function AppShell({ dashboard }) {
  return (
    <div className="app-shell">
      <div className="page-orb page-orb-top" aria-hidden="true" />
      <div className="page-orb page-orb-bottom" aria-hidden="true" />

      <Sidebar brand={dashboard.brand} navigation={dashboard.navigation} />

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">{dashboard.brand.status}</p>
            <h1>Messaging UI built as a reusable layout system.</h1>
          </div>

          <div className="topbar-actions">
            <div className="search-pill" aria-label="Workspace search">
              <span className="search-dot" />
              <span>Search modules, views, or tasks</span>
            </div>
            <a className="action-button" href="#delivery">
              View roadmap
            </a>
          </div>
        </header>

        <main className="main-grid">
          <section className="hero-panel" id="overview">
            <div className="hero-copy">
              <p className="section-eyebrow">Frontend foundation</p>
              <h2>
                Layouts first, shared components second, features after that.
              </h2>
              <p className="hero-description">
                This shell is the starting point for auth, chat and workspace
                screens. The structure is intentionally split so the app can grow
                in small, safe increments.
              </p>

              <div className="hero-chips" aria-label="Core principles">
                <span>Component system</span>
                <span>Responsive shell</span>
                <span>Realtime ready</span>
                <span>GitHub updates</span>
              </div>
            </div>

            <div className="hero-preview" aria-label="Workspace preview">
              <div className="preview-window">
                <div className="preview-bar">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="preview-body">
                  <div>
                    <p className="preview-label">Active layout</p>
                    <strong>App shell</strong>
                  </div>
                  <div className="preview-stack">
                    <div>
                      <span>Sidebar</span>
                      <strong>Navigation</strong>
                    </div>
                    <div>
                      <span>Workspace</span>
                      <strong>Dashboard panels</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>Ready to extend</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Project metrics">
            {dashboard.quickStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section className="content-grid" id="layouts">
            <SectionCard
              className="stack-card"
              eyebrow="Architecture"
              title="What this shell gives us"
            >
              <div className="feature-stack">
                {dashboard.featureCards.map((card) => (
                  <article key={card.title} className="feature-card">
                    <p>{card.meta}</p>
                    <strong>{card.title}</strong>
                    <span>{card.description}</span>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              className="timeline-card"
              eyebrow="Delivery"
              title="Current build checklist"
              id="delivery"
            >
              <ul className="timeline-list">
                {dashboard.activity.map((item) => (
                  <TimelineItem key={item.title} {...item} />
                ))}
              </ul>
            </SectionCard>
          </section>

          <section className="bottom-grid" id="components">
            <SectionCard eyebrow="Next up" title="Milestones to ship next">
              <ul className="bullet-list">
                {dashboard.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard eyebrow="Roadmap" title="How the frontend will grow">
              <div className="mini-roadmap">
                {dashboard.milestones.map((milestone) => (
                  <article key={milestone.title}>
                    <strong>{milestone.title}</strong>
                    <p>{milestone.detail}</p>
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>
        </main>
      </div>
    </div>
  )
}

export default AppShell