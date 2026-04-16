import { useState } from 'react'
import { useMyDietPlan } from '../hooks/useDietPlan'
import { useGameData } from '../hooks/useGameData'

export default function Dieta() {
  const { data: plan, isLoading } = useMyDietPlan()
  const { D, save } = useGameData()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ time: '', name: '', items: '' })

  if (isLoading) return (
    <div className="main-content">
      <div className="loading-screen" style={{ minHeight: 300 }}><div className="spinner" /></div>
    </div>
  )

  /* ─── PRO PLAN (locked) ─── */
  if (plan) {
    const { meals = [], calories, goal } = plan.content
    return (
      <div className="main-content">
        <div style={{ marginBottom: 16 }}>
          <h2>Minha Dieta</h2>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {calories && <span className="badge" style={{ background: 'var(--accent)', color: '#000' }}>{calories} kcal/dia</span>}
            {goal && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text)' }}>{goal}</span>}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(37,196,90,0.08)', border: '1px solid rgba(37,196,90,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20,
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔒</span>
          <p style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
            Plano enviado pela sua Nutricionista — para editar, fale com ela.
          </p>
        </div>

        {plan.notes && (
          <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Nutricionista:</strong> {plan.notes}
            </p>
          </div>
        )}

        {meals.map((meal, i) => (
          <div key={i} className="meal-card">
            <div className="meal-header">
              <span className="meal-time">{meal.time}</span>
              <span className="meal-name">{meal.name}</span>
            </div>
            <div className="meal-body">
              {meal.items?.map((item, j) => (
                <div key={j} className="meal-item">
                  <span className="meal-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ─── USER OWN MEALS ─── */
  const myMeals = D?.myMeals || []

  function addMeal(e) {
    e.preventDefault()
    const meal = {
      time: form.time,
      name: form.name,
      items: form.items.split('\n').map(s => s.trim()).filter(Boolean),
    }
    save({ ...D, myMeals: [...myMeals, meal] })
    setForm({ time: '', name: '', items: '' })
    setAdding(false)
  }

  function removeMeal(i) {
    save({ ...D, myMeals: myMeals.filter((_, j) => j !== i) })
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Minha Dieta</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>Suas refeições do dia</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setAdding(v => !v)}>
          {adding ? '✕' : '+ Refeição'}
        </button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface-2)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20,
      }}>
        <span style={{ fontSize: '1.1rem' }}>💡</span>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          Adicione suas refeições ou{' '}
          <strong style={{ color: 'var(--accent)' }}>contrate uma Nutricionista</strong>{' '}
          nos Planos para receber uma dieta profissional.
        </p>
      </div>

      {adding && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={addMeal}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>Nova refeição</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div className="input-group" style={{ width: 90 }}>
              <label>Horário</label>
              <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="08:00" />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Café da manhã" required />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label>Alimentos (um por linha)</label>
            <textarea
              value={form.items}
              onChange={e => setForm(f => ({ ...f, items: e.target.value }))}
              placeholder={'2 ovos mexidos\n1 fatia de pão integral\nCafé sem açúcar'}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>
          <button className="btn btn-primary" type="submit">Adicionar refeição</button>
        </form>
      )}

      {!myMeals.length && !adding && (
        <div className="plan-empty">
          <div className="plan-empty-icon">🥗</div>
          <h3>Nenhuma refeição cadastrada</h3>
          <p>Adicione suas refeições acima ou contrate uma nutricionista nos Planos.</p>
        </div>
      )}

      {myMeals.map((meal, i) => (
        <div key={i} className="meal-card">
          <div className="meal-header" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="meal-time">{meal.time}</span>
              <span className="meal-name">{meal.name}</span>
            </span>
            <button
              onClick={() => removeMeal(i)}
              style={{ background: 'rgba(232,53,53,0.15)', border: 'none', borderRadius: 4, color: 'var(--danger)', padding: '3px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
            >🗑</button>
          </div>
          <div className="meal-body">
            {meal.items?.map((item, j) => (
              <div key={j} className="meal-item">
                <span className="meal-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
