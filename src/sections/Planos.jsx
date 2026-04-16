import { useState } from 'react'
import Profissionais from './Profissionais'

const PLANS = [
  {
    id: 'fitness',
    emoji: '⚡',
    name: 'FOCO FITNESS',
    subtitle: 'Personal + Nutricionista',
    description: 'Treino e alimentação alinhados para maximizar seus resultados.',
    features: [
      'Plano de treino personalizado',
      'Dieta elaborada por nutricionista',
      'Acompanhamento semanal',
      'Ajustes conforme sua evolução',
    ],
    price: 149,
    featured: false,
    color: '#e8a020',
    pros: ['personal', 'nutritionist'],
  },
  {
    id: 'estetica',
    emoji: '✨',
    name: 'CORPO & ESTÉTICA',
    subtitle: 'Nutricionista + Esteticista',
    description: 'Nutrição e cuidados estéticos para você se sentir incrível.',
    features: [
      'Dieta personalizada',
      'Protocolos de tratamentos estéticos',
      'Plano de skincare e autocuidado',
      'Acompanhamento nutricional contínuo',
    ],
    price: 129,
    featured: false,
    color: '#a78bfa',
    pros: ['nutritionist', 'aesthetician'],
  },
  {
    id: 'shape',
    emoji: '🔥',
    name: 'SHAPE TOTAL',
    subtitle: 'Personal + Esteticista',
    description: 'Treino intenso com recuperação e estética de alto nível.',
    features: [
      'Treino periodizado e progressivo',
      'Procedimentos estéticos pós-treino',
      'Técnicas de recuperação muscular',
      'Acompanhamento físico completo',
    ],
    price: 139,
    featured: false,
    color: '#f06292',
    pros: ['personal', 'aesthetician'],
  },
  {
    id: 'elite',
    emoji: '👑',
    name: 'ELITE TOTAL',
    subtitle: 'Personal + Nutricionista + Esteticista',
    description: 'O pacote completo. Time inteiro de profissionais dedicados a você.',
    features: [
      'Treino + Dieta + Estética',
      'Time completo de especialistas',
      'Acompanhamento prioritário 24/7',
      'Reavaliações mensais presenciais',
      'Acesso a todos os recursos premium',
    ],
    price: 199,
    featured: true,
    color: '#e8a020',
    pros: ['personal', 'nutritionist', 'aesthetician'],
  },
]

const PRO_LABELS = {
  personal: 'Personal Trainer',
  nutritionist: 'Nutricionista',
  aesthetician: 'Esteticista',
}

export default function Planos() {
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showPros, setShowPros] = useState(false)

  if (showPros) {
    return (
      <div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowPros(false)}
            className="back-btn"
          >←</button>
          <h3>Profissionais disponíveis</h3>
        </div>
        <Profissionais />
      </div>
    )
  }

  return (
    <div className="main-content">
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '3px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8 }}>
          Acompanhamento profissional
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-1px' }}>Escolha seu plano</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 8, lineHeight: 1.5 }}>
          Receba planos de treino, dieta e estética diretamente no app pelos profissionais.
        </p>
      </div>

      {/* PLAN CARDS */}
      {PLANS.map(plan => (
        <div
          key={plan.id}
          onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
          style={{
            background: plan.featured ? 'linear-gradient(160deg, #1a1005, #0f0c07)' : 'var(--surface)',
            border: `1px solid ${plan.featured ? 'rgba(232,160,32,0.35)' : 'var(--card-border)'}`,
            borderTop: `3px solid ${plan.color}`,
            borderRadius: 'var(--radius)',
            padding: '20px',
            marginBottom: 14,
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {plan.featured && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'var(--accent)', color: '#000',
              fontSize: '0.62rem', fontWeight: 900,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 3,
            }}>Mais popular</div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-sm)',
              background: `${plan.color}20`,
              border: `1px solid ${plan.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', flexShrink: 0,
            }}>{plan.emoji}</div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 900, letterSpacing: '1.5px',
                color: plan.color, textTransform: 'uppercase', marginBottom: 2,
              }}>{plan.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>{plan.subtitle}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>
                  R${plan.price}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>/mês</span>
              </div>
            </div>
          </div>

          {/* EXPANDED */}
          {selectedPlan === plan.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                {plan.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {plan.pros.map(p => (
                  <span key={p} style={{
                    background: `${plan.color}15`,
                    color: plan.color,
                    border: `1px solid ${plan.color}30`,
                    fontSize: '0.72rem', fontWeight: 700,
                    padding: '4px 10px', borderRadius: 4,
                    letterSpacing: '0.5px',
                  }}>{PRO_LABELS[p]}</span>
                ))}
              </div>

              {plan.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: plan.color, fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{f}</span>
                </div>
              ))}

              <button
                className="btn btn-primary"
                style={{ marginTop: 16, background: plan.color, color: plan.featured ? '#000' : '#fff' }}
                onClick={e => { e.stopPropagation(); setShowPros(true) }}
              >
                Ver profissionais disponíveis →
              </button>
            </div>
          )}
        </div>
      ))}

      {/* HOW IT WORKS */}
      <div style={{ marginTop: 24, padding: '20px', background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '2px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>
          Como funciona
        </div>
        {[
          { n: '01', t: 'Escolha seu plano', d: 'Selecione a combinação de profissionais que faz sentido para você.' },
          { n: '02', t: 'Fale com seu profissional', d: 'Após a contratação, seu profissional entra em contato para a avaliação inicial.' },
          { n: '03', t: 'Receba seu plano no app', d: 'Treino, dieta e protocolos de estética chegam direto nas abas do seu app.' },
          { n: '04', t: 'Acompanhe e evolua', d: 'Registre seu progresso e receba ajustes do seu profissional ao longo do tempo.' },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)', color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 900, flexShrink: 0,
            }}>{step.n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{step.t}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>{step.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
