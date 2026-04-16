import { useState } from 'react'
import { useUserStore } from '../../stores/useUserStore'
import { useCreateBooking } from '../../hooks/useProfessionals'

const GOALS = [
  { value: 'lose_weight', label: 'Emagrecer' },
  { value: 'gain_weight', label: 'Ganhar peso' },
  { value: 'maintain', label: 'Manter peso' },
  { value: 'gain_muscle', label: 'Ganhar massa muscular' },
  { value: 'health', label: 'Melhorar saúde geral' },
  { value: 'aesthetics', label: 'Cuidar da estética' },
]

const DAYS = [1, 2, 3, 4, 5, 6]

export default function BookingForm({ professional, service, onClose }) {
  const { profile } = useUserStore()
  const createBooking = useCreateBooking()

  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [goal, setGoal] = useState('')
  const [notes, setNotes] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const isPersonal = professional.type === 'personal'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const booking = {
      client_id: profile.id,
      professional_id: professional.id,
      service_id: service.id,
      client_weight: weight ? parseFloat(weight) : null,
      client_height: height ? parseFloat(height) : null,
      client_age: age ? parseInt(age) : null,
      client_goal: goal,
      client_notes: notes,
      days_per_week: isPersonal ? daysPerWeek : null,
    }

    try {
      await createBooking.mutateAsync(booking)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (success) {
    return (
      <div className="booking-overlay" onClick={onClose}>
        <div className="booking-sheet" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h3>Solicitação enviada!</h3>
            <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: '0.9rem' }}>
              O profissional irá confirmar seu agendamento em breve.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="booking-overlay" onClick={onClose}>
      <div className="booking-sheet" onClick={e => e.stopPropagation()}>
        <h3>Agendar: {service.name}</h3>
        <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 20, marginTop: -10 }}>
          R$ {(service.price_cents / 100).toFixed(0)}
          {isPersonal && ` / ${daysPerWeek}x por semana`}
        </p>

        {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-group">
              <label>Peso (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" />
            </div>
            <div className="input-group">
              <label>Altura (cm)</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
            </div>
          </div>
          <div className="input-group">
            <label>Idade</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" />
          </div>
          <div className="input-group">
            <label>Objetivo</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} required>
              <option value="">Selecione seu objetivo</option>
              {GOALS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {isPersonal && (
            <div className="input-group">
              <label>Dias por semana</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysPerWeek(d)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${daysPerWeek === d ? 'var(--accent)' : 'var(--line)'}`,
                      background: daysPerWeek === d ? 'var(--accent-soft)' : 'var(--surface-2)',
                      color: daysPerWeek === d ? 'var(--accent)' : 'var(--muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Doenças, restrições, preferências..."
              rows={3}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={createBooking.isPending}>
            {createBooking.isPending ? 'Enviando…' : 'Confirmar agendamento'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        </form>
      </div>
    </div>
  )
}
