function SectionCard({ title, eyebrow, children, className = '', id }) {
  return (
    <section className={`section-card ${className}`.trim()} id={id}>
      {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export default SectionCard