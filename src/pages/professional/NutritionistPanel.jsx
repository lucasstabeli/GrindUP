import { useState } from 'react'
import { useMyProfessionalProfile, useMyClients, usePendingBookings, useConfirmBooking } from '../../hooks/useProfessionals'
import { useClientDietPlan, useSaveDietPlan } from '../../hooks/useDietPlan'

const SAMPLE_DIET = {
  calories: 2000,
  goal: 'Emagrecimento',
  meals: [
    {
      time: '07:00',
      name: 'Café da manhã',
      items: ['2 ovos mexidos', '1 fatia de pão integral', '1 banana', 'Café sem açúcar']
    },
    {
      time: '12:00',
      name: 'Almoço',
      items: ['150g de frango grelhado', '3 col. de arroz integral', 'Salada verde à vontade', 'Feijão']
    },
    {
      time: '15:00',
      name: 'Lanche',
      items: ['1 iogurte grego', '1 fruta']
    },
    {
      time: '19:00',
      name: 'Jantar',
      items: ['150g de peixe', 'Legumes cozidos', 'Salada']
    }
  ]
}

function DietEditor({ client, proProfileId, onBack }) {
  const { data: existing } = useClientDietPlan(client.profiles.id, proProfileId)
  const saveDiet = useSaveDietPlan()
  const [content, setContent] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const currentContent = content || (existing ? JSON.stringify(existing.content, null, 2) : JSON.stringify(SAMPLE_DIET, null, 2))

  async function handleSave() {
    setError('')
    try {
      JSON.parse(currentContent)
    } catch {
      setError('JSON inválido. Verifique a formatação.')
      return
    }
    try {
      await saveDiet.mutateAsync({
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
          <h3>Dieta de {client.profiles.name}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{client.services?.name}</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
      {saved && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: '#22c55e', marginBottom: 12, fontSize: '0.9rem' }}>
          ✅ Plano salvo com sucesso!
        </div>
      )}

      <div className="input-group" style={{ marginBottom: 12 }}>
        <label>Observações para o cliente</label>
        <input
          value={notes || existing?.notes || ''}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex: Evitar açúcar refinado, beber 2L de água por dia..."
        />
      </div>

      <div className="input-group" style={{ marginBottom: 16 }}>
        <label>Plano alimentar (JSON)</label>
        <textarea
          className="json-editor"
          value={content || (existing ? JSON.stringify(existing.content, null, 2) : JSON.stringify(SAMPLE_DIET, null, 2))}
          onChange={e => setContent(e.target.value)}
          rows={20}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saveDiet.isPending}>
        {saveDiet.isPending ? 'Salvando…' : 'Salvar plano alimentar'}
      </button>
    </div>
  )
}

export default function NutritionistPanel() {
  const { data: proProfile } = useMyProfessionalProfile()
  const { data: clients } = useMyClients()
  const { data: pending } = usePendingBookings()
  const confirmBooking = useConfirmBooking()
  const [tab, setTab] = useState('clients')
  const [editingClient, setEditingClient] = useState(null)

  if (editingClient) {
    return <DietEditor client={editingClient} proProfileId={proProfile?.id} onBack={() => setEditingClient(null)} />
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
                  {booking.client_goal && ` • Objetivo: ${booking.client_goal}`}
                </div>
              </div>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>Editar dieta →</span>
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
                  <div className="booking-service">{booking.services?.name}</div>
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
