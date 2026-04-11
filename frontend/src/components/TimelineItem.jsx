function TimelineItem({ title, detail, status }) {
  return (
    <li className="timeline-item">
      <span className={`timeline-badge is-${status}`} />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </li>
  )
}

export default TimelineItem