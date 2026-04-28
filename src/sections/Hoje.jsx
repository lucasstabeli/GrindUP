import { useState } from 'react'
import { useGameData, fmt, pct, ALL_DAYS, DAY_LETTERS, todayIdx, dayName, getWeekWorkout, WORKOUTS } from '../hooks/useGameData'
import SwipeTaskCard from '../components/SwipeTaskCard'

export default function Hoje({ onNavigate }) {
  const { D, save } = useGameData()
  const [kaffaPop, setKaffaPop] = useState(0)
  if (!D) return null

  const idx = todayIdx()

  // Only count/show tasks scheduled for today
  const todayTasks = D.tasks
    .map((t, i) => ({ ...t, _origIdx: i }))
    .filter(t => (t.days ?? ALL_DAYS).includes(idx))

  const done = [D.kaffa.done, ...todayTasks.map(t => t.state === 'done')].filter(Boolean).length
  const total = 1 + todayTasks.length
  const dayPct = pct(done, total)

  function completeKaffa() {
    if (D.kaffa.done) return
    const trophy = D.kaffa.trophy ?? 20
    setKaffaPop(trophy)
    setTimeout(() => setKaffaPop(0), 900)
    save({
      ...D,
      kaffa: { ...D.kaffa, done: true },
      coins: D.coins + D.kaffa.reward,
      trophies: (D.trophies || 0) + trophy,
    })
  }

  function setTask(origIdx, state) {
    const prev = D.tasks[origIdx].state
    if (prev === state) return
    const t = D.tasks[origIdx]
    const pen = t.penalty || 0
    const trophyVal = t.trophy ?? 1
    let coins = D.coins
    let trophies = D.trophies || 0
    if (prev === 'done'   && state === 'idle')   { coins = Math.max(0, coins - t.reward); trophies = Math.max(0, trophies - trophyVal) }
    if (prev === 'failed' && state === 'idle')   { coins += pen }
    if (state === 'done'  && prev !== 'done')    { coins += t.reward; trophies += trophyVal }
    if (state === 'failed') {
      if (prev === 'done') { coins = Math.max(0, coins - t.reward); trophies = Math.max(0, trophies - trophyVal) }
      if (!D.vacation)     coins = Math.max(0, coins - pen)
    }
    const tasks = D.tasks.map((tk, j) => j === origIdx ? { ...tk, state } : tk)
    save({ ...D, tasks, coins, trophies })
  }

  function tapWater(i) {
    let current = i < D.water.current ? i : i + 1
    current = Math.min(current, D.water.goal)
    save({ ...D, water: { ...D.water, current } })
  }

  const active = D.courses.find(c => pct(c.done, c.total) < 100) || D.courses[0]

  return (
    <div className="app-section">
      {/* HERO */}
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="pill">{dayName()} · foco do dia</div>
            <p>Complete as missões para avançar na rotina e ganhar moedas.</p>
          </div>
          <div className="pill">{done}/{total} feitas</div>
        </div>
        <div className="stats">
          <article className="stat"><strong>{D.streak}</strong><span>Streak</span></article>
          <article className="stat"><strong>{fmt(D.coins)}</strong><span>Moedas</span></article>
          <article className="stat"><strong>{dayPct}%</strong><span>Dia</span></article>
        </div>
      </div>

      <div className="d-grid">
        <div>
          {/* KAFFA */}
          <div className="section-head"><h2>Missão do ano</h2><span>👑 principal do ano</span></div>
          <div className={`task-card ${D.kaffa.done ? 'done' : ''}`} style={{ borderColor: D.kaffa.done ? 'rgba(51,177,111,.45)' : 'rgba(240,106,59,.4)', position: 'relative' }}>
            {kaffaPop > 0 && <div className="trophy-pop">+{kaffaPop} 🏆</div>}
            <div className="task-top">
              <div className="emoji-box" style={{ background: 'rgba(240,106,59,.18)', fontSize: 24 }}>👑</div>
              <div className="task-main">
                <h3>{D.kaffa.name}</h3>
                <p>{D.kaffa.desc}</p>
                <div className="mini-row">
                  <span className="chip" style={{ background: 'rgba(240,106,59,.18)', color: 'var(--accent)' }}>+{fmt(D.kaffa.reward)} moedas</span>
                  {(D.kaffa.penalty || 0) > 0 && <span className="chip penalty-chip">-{D.kaffa.penalty} 🪙 falhar</span>}
                </div>
              </div>
              <div className="task-status">
                <span className={`tag ${D.kaffa.done ? 'done' : 'accent'}`}>{D.kaffa.done ? '✓ Feito' : '⭐ Ano'}</span>
              </div>
            </div>
            {D.kaffa.done
              ? <div className="note success" style={{ marginTop: 12 }}>✓ Missão concluída! +{fmt(D.kaffa.reward)} moedas ganhas.</div>
              : <div className="task-actions"><button className="btn primary" onClick={completeKaffa}>Concluir Missão ✓</button></div>}
          </div>

          {/* TASKS */}
          <div className="section-head" style={{ marginTop: 16 }}>
            <h2>Missões do dia</h2>
            <span>diárias</span>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
              <p style={{ fontSize: '0.9rem' }}>Nenhuma missão para hoje!</p>
              <p style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.7 }}>Aproveite o dia livre.</p>
            </div>
          ) : (
            <div className="stack">
              {todayTasks.map((t) => (
                <SwipeTaskCard
                  key={t._origIdx}
                  task={t}
                  index={t._origIdx}
                  onComplete={(origIdx) => setTask(origIdx, 'done')}
                  onFail={(origIdx) => setTask(origIdx, 'failed')}
                  onUndo={(origIdx) => setTask(origIdx, 'idle')}
                />
              ))}
            </div>
          )}

          <p style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            Complete as missões para ganhar moedas 🪙
          </p>
        </div>

        <aside>
          <div className="section-head"><h2>Radar</h2><span>visão geral</span></div>
          <div className="stack">
            {/* ÁGUA */}
            <div className="panel">
              <div className="panel-title">Água</div>
              <div className="big-num">{D.water.current} / {D.water.goal}</div>
              <div className="sub-text">{(D.water.current * 0.5).toFixed(1)}L de {(D.water.goal * 0.5).toFixed(1)}L</div>
              <div className="progress"><span style={{ width: `${pct(D.water.current, D.water.goal)}%` }}></span></div>
              <div className="water-cups">
                {Array.from({ length: D.water.goal }, (_, i) => (
                  <div key={i} className={`wcup ${i < D.water.current ? 'filled' : ''}`} onClick={() => tapWater(i)}>💧</div>
                ))}
              </div>
            </div>

            {/* TREINO */}
            <div className="panel">
              <div className="panel-title">Treino de hoje</div>
              <div className="big-num">{getWeekWorkout(D, idx)}</div>
              <div className="sub-text">{idx === 6 ? 'Dia de descanso' : 'Foco total hoje'}</div>
              <div className="mini-row"><span className="chip">+35 moedas</span></div>
            </div>

            {/* CURSO FOCO */}
            {active && (() => {
              const p = pct(active.done, active.total)
              return (
                <div className="panel">
                  <div className="panel-title">Curso foco</div>
                  <div className="big-num">{p}%</div>
                  <div className="sub-text">{active.name}</div>
                  <div className="progress"><span style={{ width: `${p}%` }}></span></div>
                </div>
              )
            })()}

            {/* MINI CALENDAR */}
            {(() => {
              const calLog = D.calendarLog || {}
              const now = new Date()
              const dow = now.getDay()
              const mondayOffset = dow === 0 ? -6 : 1 - dow
              const weekDays = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now)
                d.setHours(0, 0, 0, 0)
                d.setDate(now.getDate() + mondayOffset + i)
                return d
              })
              return (
                <div className="panel">
                  <div className="panel-title">Semana de treinos</div>
                  <div className="cal-grid">
                    {weekDays.map((d, i) => {
                      const key = d.toISOString().split('T')[0]
                      const entry = calLog[key]
                      const st = entry?.status || ''
                      return (
                        <div key={i} className={`cal-day ${st} ${i === idx ? 'today' : ''}`}>
                          <span>{DAY_LETTERS[i]}</span>
                          <span className="wt-label">
                            {(entry?.actual || getWeekWorkout(D, i)).substring(0, 3)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </aside>
      </div>
    </div>
  )
}
