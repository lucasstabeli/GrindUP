import { useState } from 'react'
import { useMyProfessionalProfile, useMyClients, usePendingBookings, useConfirmBooking } from '../../hooks/useProfessionals'
import { useClientWorkoutPlan, useSaveWorkoutPlan } from '../../hooks/useWorkoutPlan'

const SAMPLE_WORKOUT = {
  days: [
    {
      name: 'Seg — Peito e Tríceps',
      exercises: [
        { name: 'Supino Reto', sets: 4, reps: '10-12', rest: '60s' },
        { name: 'Supino Inclinado', sets: 3, reps: '12', rest: '60s' },
        { name: 'Crucifixo', sets: 3, reps: '15', rest: '45s' },
        { name: 'Tríceps Corda', sets: 4, reps: '15', rest: '45s' },
      ]
    },
    {
      name: 'Qua — Costas e Bíceps',
      exercises: [
        { name: 'Puxada Frontal', sets: 4, reps: '10-12', rest: '60s' },
        { name: 'Remada Curvada', sets: 3, reps: '12', rest: '60s' },
        { name: 'Rosca Direta', sets: 3, reps: '12', rest: '45s' },
      ]
    },
    {
      name: 'Sex — Pernas',
      exercises: [
        { name: 'Agachamento', sets: 4, reps: '10-12', rest: '90s' },
        { name: 'Leg Press', sets: 3, reps: '15', rest: '60s' },
        { name: 'Cadeira Extensora', sets: 3, reps: '15', rest: '45s' },
        { name: 'Panturrilha em Pé', sets: 4, reps: '20', rest: '30s' },
      ]
    }
  ]
}

function WorkoutEditor({ client, proProfileId, onBack }) {
  const { data: existing } = useClientWorkoutPlan(client.profiles.id, proProfileId)
  const saveWorkout = useSaveWorkoutPlan()
  const [content, setContent] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const currentContent = content || (existing ? JSON.stringify(existing.content, null, 2) : JSON.stringify(SAMPLE_WORKOUT, null, 2))

  async function handleSave() {
    setError('')
    try {
      JSON.parse(currentContent)
    } catch {
      setError('JSON inválido. Verifique a formatação.')
      return
    }
    try {
      await saveWorkout.mutateAsync({
        client_id: client.profiles.id,
        professional_id: proProfileId,
        content: JSON.parse(currentContent),
        notes: notes || existing?.notes || '',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="plan-editor">
      <div className="plan-editor-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <h3>Treino de {client.profiles.name}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            {client.services?.name}{client.days_per_week ? ` • ${client.days_per_week}x/semana` : ''}
          </p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
      {saved && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: '#22c55e', marginBottom: 12, fontSize: '0.9rem' }}>
          ✅ Treino salvo com sucesso!
        </div>
      )}

      <div className="input-group" style={{ marginBottom: 12 }}>
        <label>Observações para o cliente</label>
        <input
          value={notes || existing?.notes || ''}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex: Descanso de 7-8h por noite, hidratação..."
        />
      </div>

      <div className="input-group" style={{ marginBottom: 16 }}>
        <label>Plano de treino (JSON)</label>
        <textarea
          className="json-editor"
          value={content || (existing ? JSON.stringify(existing.content, null, 2) : JSON.stringify(SAMPLE_WORKOUT, null, 2))}
          onChange={e => setContent(e.target.value)}
          rows={25}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saveWorkout.isPending}>
        {saveWorkout.isPending ? 'Salvando…' : 'Salvar treino'}
      </button>
    </div>
  )
}

export default function PersonalPanel() {
  const { data: proProfile } = useMyProfessionalProfile()
  const { data: clients } = useMyClients()
  const { data: pending } = usePendingBookings()
  const confirmBooking = useConfirmBooking()
  const [tab, setTab] = useState('clients')
  const [editingClient, setEditingClient] = useState(null)

  if (editingClient) {
    return <WorkoutEditor client={editingClient} proProfileId={proProfile?.id} onBack={() => setEditingClient(null)} />
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div className="panel-tabs">
        <button className={`panel-tab ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>
          Meus clientes {clients?.length ? `(${clients.length})` : ''}
        </button>
        <button className={`panel-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Agendamentos {pending?.length ? `(${pending.length})` : ''}
        </button>
      </div>

      {tab === 'clients' && (
        <div>
          {!clients?.length && (
            <div className="plan-empty">
              <div className="plan-empty-icon">👥</div>
              <h3>Nenhum cliente ainda</h3>
              <p>Confirme agendamentos para começar a atender.</p>
            </div>
          )}
          {clients?.map(booking => (
            <div
              key={booking.id}
              className="client-list-item"
              onClick={() => setEditingClient(booking)}
            >
              <div className="client-avatar">
                {booking.profiles?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="client-info">
                <div className="client-name">{booking.profiles?.name}</div>
                <div className="client-meta">
                  {booking.services?.name}
                  {booking.days_per_week && ` • ${booking.days_per_week}x/semana`}
                </div>
              </div>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>Editar treino →</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'pending' && (
        <div className="main-content">
          {!pending?.length && (
            <div className="plan-empty">
              <div className="plan-empty-icon">📋</div>
              <h3>Sem agendamentos pendentes</h3>
            </div>
          )}
          {pending?.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-card-header">
                <div>
                  <div className="booking-client">{booking.profiles?.name}</div>
                  <div className="booking-service">
                    {booking.services?.name}
                    {booking.days_per_week && ` • ${booking.days_per_week}x/semana`}
                  </div>
                </div>
                <span className="booking-status pending">Pendente</span>
              </div>
              <div className="booking-details">
                {booking.client_weight && `Peso: ${booking.client_weight}kg`}
                {booking.client_height && ` • Altura: ${booking.client_height}cm`}
                {booking.client_age && ` • Idade: ${booking.client_age} anos`}
                {booking.client_goal && <><br />Objetivo: {booking.client_goal}</>}
                {booking.client_notes && <><br />Obs: {booking.client_notes}</>}
              </div>
              <div className="booking-actions">
                <button
                  className="btn btn-primary"
                  style={{ background: 'var(--success)' }}
                  onClick={() => confirmBooking.mutate({ id: booking.id, status: 'confirmed' })}
                >
                  ✓ Confirmar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => confirmBooking.mutate({ id: booking.id, status: 'cancelled' })}
                >
                  ✕ Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
