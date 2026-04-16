import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import BookingForm from './BookingForm'

const TYPE_LABELS = {
  nutritionist: 'Nutricionista',
  personal: 'Personal Trainer',
  aesthetician: 'Esteticista',
}

export default function Portfolio({ professional, onBack }) {
  const [selectedService, setSelectedService] = useState(null)
  const [showBooking, setShowBooking] = useState(false)

  const { data: services } = useQuery({
    queryKey: ['services', professional.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professional.id)
        .eq('active', true)
      if (error) throw error
      return data
    },
  })

  const name = professional.profiles?.name || 'Profissional'
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  function handleBook(service) {
    setSelectedService(service)
    setShowBooking(true)
  }

  return (
    <div className="portfolio-page">
      <div className="topbar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <span style={{ fontWeight: 700 }}>Portfólio</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="portfolio-header">
        <div className="portfolio-avatar">{initials}</div>
        <div className="portfolio-name">{name}</div>
        <div className="portfolio-role">{TYPE_LABELS[professional.type]}</div>
        {professional.bio && <p className="portfolio-bio">{professional.bio}</p>}
        {professional.specialties?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 }}>
            {professional.specialties.map((s, i) => (
              <span key={i} className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      <div className="portfolio-body">
        {services?.length > 0 && (
          <div className="portfolio-section">
            <div className="portfolio-section-title">Serviços disponíveis</div>
            {services.map(service => (
              <div
                key={service.id}
                className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                onClick={() => handleBook(service)}
              >
                <div className="service-info">
                  <div className="service-name">{service.name}</div>
                  {service.description && <div className="service-desc">{service.description}</div>}
                  {service.price_label && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{service.price_label}</div>
                  )}
                </div>
                <div className="service-price">
                  R$ {(service.price_cents / 100).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!services?.length && (
          <div className="plan-empty">
            <div className="plan-empty-icon">📋</div>
            <h3>Nenhum serviço cadastrado</h3>
            <p>Este profissional ainda não adicionou serviços.</p>
          </div>
        )}
      </div>

      {showBooking && selectedService && (
        <BookingForm
          professional={professional}
          service={selectedService}
          onClose={() => { setShowBooking(false); setSelectedService(null) }}
        />
      )}
    </div>
  )
}
