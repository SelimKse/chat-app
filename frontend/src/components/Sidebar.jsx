function Sidebar({ brand, navigation }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <span className="brand-mark">TC</span>
        <div>
          <p className="brand-name">{brand.name}</p>
          <p className="brand-tagline">{brand.tagline}</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {navigation.map((item) => (
          <a
            key={item.label}
            className={item.active ? 'nav-link is-active' : 'nav-link'}
            href={item.href}
          >
            <span>{item.label}</span>
            {item.active ? <span className="nav-dot" /> : null}
          </a>
        ))}
      </nav>

      <div className="sidebar-card">
        <p className="sidebar-card-label">Current focus</p>
        <strong>Layout-first build</strong>
        <p>
          Shared pieces are being added before product screens so the codebase
          stays predictable.
        </p>
      </div>

      <div className="sidebar-footer">
        <span className="status-chip">{brand.status}</span>
        <p>Backend stable, frontend growing in small updates.</p>
      </div>
    </aside>
  )
}

export default Sidebar