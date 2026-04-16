import { useState } from 'react'
import { useProfessionals } from '../hooks/useProfessionals'
import Portfolio from '../components/professional/Portfolio'

const TYPE_LABELS = {
  nutritionist: 'Nutricionista',
  personal: 'Personal Trainer',
  aesthetician: 'Esteticista',
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'nutritionist', label: 'Nutricionista' },
  { value: 'personal', label: 'Personal' },
  { value: 'aesthetician', label: 'Esteticista' },
]

export default function Profissionais() {
  const [filter, setFilter] = useState('')
  const [selectedPro, setSelectedPro] = useState(null)
  const { data: professionals, isLoading } = useProfessionals(filter || undefined)

  if (selectedPro) {
    return <Portfolio professional={selectedPro} onBack={() => setSelectedPro(null)} />
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: 16 }}>
        <h2>Profissionais 👩‍⚕️</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Encontre e agende com especialistas
        </p>
      </div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`filter-tab ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      )}

      {!isLoading && !professionals?.length && (
        <div className="plan-empty">
          <div className="plan-empty-icon">🔍</div>
          <h3>Nenhum profissional encontrado</h3>
          <p>Tente outro filtro ou volte mais tarde.</p>
        </div>
      )}

      {professionals?.map(pro => {
        const name = pro.profiles?.name || 'Profissional'
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        return (
          <div key={pro.id} className="pro-card" onClick={() => setSelectedPro(pro)}>
            <div className="pro-avatar">{initials}</div>
            <div className="pro-info">
              <div className="pro-name">{name}</div>
              <div className="pro-role">{TYPE_LABELS[pro.type]}</div>
              <div className="pro-desc">{pro.bio || 'Clique para ver o portfólio completo'}</div>
            </div>
            <span className="pro-arrow">›</span>
          </div>
        )
      })}
    </div>
  )
}
