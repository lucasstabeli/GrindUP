import { useState } from 'react'
import { useMyWorkoutPlan } from '../hooks/useWorkoutPlan'
import { useGameData } from '../hooks/useGameData'

function LockBanner({ text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(37,196,90,0.08)', border: '1px solid rgba(37,196,90,0.2)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20,
    }}>
      <span style={{ fontSize: '1.1rem' }}>🔒</span>
      <p style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>{text}</p>
    </div>
  )
}

function InfoBanner({ onNavigate }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20,
    }}>
      <span style={{ fontSize: '1.1rem' }}>💡</span>
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        Adicione seus treinos ou{' '}
        <strong style={{ color: 'var(--accent)', cursor: 'pointer' }}>
          contrate um Personal Trainer
        </strong>{' '}
        nos Planos para receber um treino profissional.
      </p>
    </div>
  )
}

export default function Treino() {
  const { data: plan, isLoading } = useMyWorkoutPlan()
  const { D, save } = useGameData()
  const [addingDay, setAddingDay] = useState(false)
  const [dayName, setDayName] = useState('')
  const [addingEx, setAddingEx] = useState(null)
  const [exForm, setExForm] = useState({ name: '', sets: '', reps: '', rest: '' })

  if (isLoading) return (
    <div className="main-content">
      <div className="loading-screen" style={{ minHeight: 300 }}><div className="spinner" /></div>
    </div>
  )

  /* ─── PRO PLAN (locked) ─── */
  if (plan) {
    const { days = [] } = plan.content
    return (
      <div className="main-content">
        <div style={{ marginBottom: 16 }}>
          <h2>Meu Treino</h2>
          {plan.notes && <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>{plan.notes}</p>}
        </div>
        <LockBanner text="Plano enviado pelo seu Personal Trainer — para editar, fale com ele." />
        {days.map((day, i) => (
          <div key={i} className="workout-day">
            <div className="workout-day-header"><span>💪</span><span>{day.name}</span></div>
            <div className="workout-day-body">
              {day.exercises?.map((ex, j) => (
                <div key={j} className="exercise-item">
                  <span className="exercise-name">{ex.name}</span>
                  <span className="exercise-sets">{ex.sets}x{ex.reps}{ex.rest ? ` — ${ex.rest}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ─── USER OWN WORKOUTS ─── */
  const myDays = D?.myWorkoutDays || []

  function addDay(e) {
    e.preventDefault()
    save({ ...D, myWorkoutDays: [...myDays, { name: dayName, exercises: [] }] })
    setDayName('')
    setAddingDay(false)
  }

  function removeDay(i) {
    save({ ...D, myWorkoutDays: myDays.filter((_, j) => j !== i) })
  }

  function submitEx(e, dayIdx) {
    e.preventDefault()
    const days = myDays.map((d, i) =>
      i === dayIdx
        ? { ...d, exercises: [...d.exercises, { ...exForm }] }
        : d
    )
    save({ ...D, myWorkoutDays: days })
    setExForm({ name: '', sets: '', reps: '', rest: '' })
    setAddingEx(null)
  }

  function removeEx(dayIdx, exIdx) {
    const days = myDays.map((d, i) =>
      i === dayIdx ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) } : d
    )
    save({ ...D, myWorkoutDays: days })
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Meu Treino</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>Seus dias de treino</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setAddingDay(v => !v)}>
          {addingDay ? '✕' : '+ Dia'}
        </button>
      </div>

      <InfoBanner />

      {addingDay && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={addDay}>
          <p style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem' }}>Novo dia de treino</p>
          <div className="input-group" style={{ marginBottom: 10 }}>
            <label>Nome (ex: Peito + Tríceps)</label>
            <input value={dayName} onChange={e => setDayName(e.target.value)} placeholder="Peito + Tríceps" required />
          </div>
          <button className="btn btn-primary" type="submit">Adicionar dia</button>
        </form>
      )}

      {!myDays.length && !addingDay && (
        <div className="plan-empty">
          <div className="plan-empty-icon">💪</div>
          <h3>Nenhum treino cadastrado</h3>
          <p>Adicione seus dias de treino acima ou contrate um Personal Trainer nos Planos.</p>
        </div>
      )}

      {myDays.map((day, dayIdx) => (
        <div key={dayIdx} className="workout-day" style={{ marginBottom: 12 }}>
          <div className="workout-day-header" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>💪</span><span>{day.name}</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { setAddingEx(addingEx === dayIdx ? null : dayIdx); setExForm({ name: '', sets: '', reps: '', rest: '' }) }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
              >+ Exercício</button>
              <button
                onClick={() => removeDay(dayIdx)}
                style={{ background: 'rgba(232,53,53,0.2)', border: 'none', borderRadius: 4, color: 'var(--danger)', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
              >🗑</button>
            </div>
          </div>
          <div className="workout-day-body">
            {day.exercises?.map((ex, exIdx) => (
              <div key={exIdx} className="exercise-item">
                <span className="exercise-name">{ex.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="exercise-sets">{ex.sets}x{ex.reps}{ex.rest ? ` — ${ex.rest}` : ''}</span>
                  <button onClick={() => removeEx(dayIdx, exIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}>✕</button>
                </span>
              </div>
            ))}

            {addingEx === dayIdx && (
              <form onSubmit={e => submitEx(e, dayIdx)} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  placeholder="Nome do exercício (ex: Supino reto)"
                  value={exForm.name}
                  onChange={e => setExForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={inputStyle}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <input placeholder="Séries" value={exForm.sets} onChange={e => setExForm(f => ({ ...f, sets: e.target.value }))} style={inputStyle} />
                  <input placeholder="Reps" value={exForm.reps} onChange={e => setExForm(f => ({ ...f, reps: e.target.value }))} style={inputStyle} />
                  <input placeholder="Descanso" value={exForm.rest} onChange={e => setExForm(f => ({ ...f, rest: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1, padding: '8px' }}>Salvar</button>
                  <button className="btn btn-ghost" type="button" style={{ flex: 1, padding: '8px' }} onClick={() => setAddingEx(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {!day.exercises?.length && addingEx !== dayIdx && (
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', padding: '10px 0', fontStyle: 'italic' }}>
                Nenhum exercício. Clique em "+ Exercício" para adicionar.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  background: 'var(--surface-3)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  padding: '8px 10px',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
}
