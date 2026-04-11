function FeatureCard({ title, detail }) {
  return (
    <article className="feature-tile">
      <h3>{title}</h3>
      <p>{detail}</p>
    </article>
  )
}

export default FeatureCard