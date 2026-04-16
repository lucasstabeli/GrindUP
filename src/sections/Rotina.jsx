import { useGameData } from '../hooks/useGameData'

export default function Rotina() {
  const { D } = useGameData()
  if (!D) return null

  return (
    <div className="app-section">
      <div className="section-head"><h2>Rotina semanal</h2><span>programação</span></div>
      {D.routine.length > 0 ? (
        <div className="timeline">
          {D.routine.map((r, i) => (
            <article key={i} className="t-block" style={{ '--block-color': r.color }}>
              <div className="t-time">{r.time}</div>
              <div><h3>{r.title}</h3><p>{r.desc}</p></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: '0.88rem' }}>
          Configure sua rotina em <strong style={{ color: 'var(--accent)' }}>⚙️ Configurações</strong>
        </div>
      )}
    </div>
  )
}
