import { useState } from 'react'
import { useGameData, pct, fmt } from '../hooks/useGameData'

export default function Cursos() {
  const { D, save } = useGameData()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ emoji: '📚', name: '', total: '', done: '', cpp: 20 })
  const [trophyPop, setTrophyPop] = useState(null) // index of course showing pop

  if (!D) return null

  function addProgress(i, delta) {
    const c = D.courses[i]
    const newDone = Math.max(0, Math.min(c.total, c.done + delta))
    if (newDone === c.done) return
    const earned = delta > 0 ? c.cpp : 0
    const courses = D.courses.map((x, j) => j === i ? { ...x, done: newDone } : x)
    let trophies = D.trophies || 0
    const justFinished = c.done < c.total && newDone === c.total
    const undidFinish = c.done === c.total && newDone < c.total
    if (justFinished) {
      trophies += 5
      setTrophyPop(i)
      setTimeout(() => setTrophyPop(null), 900)
    }
    if (undidFinish) trophies = Math.max(0, trophies - 5)
    save({ ...D, courses, coins: D.coins + earned, trophies })
  }

  function removeCourse(i) {
    const courses = D.courses.filter((_, j) => j !== i)
    save({ ...D, courses })
  }

  function submitAdd(e) {
    e.preventDefault()
    const course = {
      emoji: form.emoji || '📚',
      name: form.name,
      total: Math.max(1, Number(form.total)),
      done: Math.min(Number(form.total), Math.max(0, Number(form.done) || 0)),
      cpp: Math.max(0, Number(form.cpp) || 20),
    }
    save({ ...D, courses: [...D.courses, course] })
    setForm({ emoji: '📚', name: '', total: '', done: '', cpp: 20 })
    setAdding(false)
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Cursos 📚</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Acompanhe seu progresso nos estudos</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setAdding(v => !v)}>
          {adding ? '✕' : '+ Novo'}
        </button>
      </div>

      {adding && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={submitAdd}>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>Novo curso</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div className="input-group" style={{ width: 64 }}>
              <label>Emoji</label>
              <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Python Avançado" required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Total de aulas</label>
              <input type="number" min="1" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} required />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Já assistidas</label>
              <input type="number" min="0" value={form.done} onChange={e => setForm(f => ({ ...f, done: e.target.value }))} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>🪙/aula</label>
              <input type="number" min="0" value={form.cpp} onChange={e => setForm(f => ({ ...f, cpp: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Adicionar curso</button>
        </form>
      )}

      {!D.courses.length && (
        <div className="plan-empty">
          <div className="plan-empty-icon">📚</div>
          <h3>Nenhum curso ainda</h3>
          <p>Adicione um curso para acompanhar seu progresso.</p>
        </div>
      )}

      {D.courses.map((c, i) => {
        const p = pct(c.done, c.total)
        const finished = p >= 100
        return (
          <div key={i} className="card" style={{ marginBottom: 12, opacity: finished ? 0.75 : 1, position: 'relative' }}>
            {trophyPop === i && <div className="trophy-pop">+5 🏆</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                  {c.done} / {c.total} aulas · +{c.cpp} 🪙 por aula
                </div>
              </div>
              {finished
                ? <span style={{ fontSize: '1.2rem' }}>✅</span>
                : <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>{p}%</span>
              }
            </div>
            <div className="progress" style={{ marginBottom: 12 }}>
              <span style={{ width: `${p}%`, background: finished ? 'var(--success)' : 'var(--accent)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, padding: '8px' }}
                onClick={() => addProgress(i, -1)}
                disabled={c.done === 0}
              >− Desfazer</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, padding: '8px' }}
                onClick={() => addProgress(i, 1)}
                disabled={finished}
              >+ Aula concluída {!finished && `(+${c.cpp}🪙)`}</button>
              <button
                className="btn btn-danger"
                style={{ padding: '8px 10px', width: 'auto' }}
                onClick={() => removeCourse(i)}
              >🗑</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
