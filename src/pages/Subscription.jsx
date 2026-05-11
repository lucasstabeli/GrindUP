import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePremium } from '../hooks/usePremium'

const FREE_FEATURES = [
  'Missões diárias',
  'Controle de água',
  'Agenda',
  'Rotina básica',
]

const PREMIUM_FEATURES = [
  'Tudo do plano grátis',
  'Ranking com outros usuários',
  'Cursos de saúde e treino',
  'Loja de recompensas (Baú)',
  'Sem limite de tarefas na rotina',
]

const PLANS = [
  {
    id: 'monthly',
    label: 'Mensal',
    price: 'R$19,90',
    sub: 'por mês',
    badge: null,
    highlight: false,
  },
  {
    id: 'annual',
    label: 'Anual',
    price: 'R$149',
    sub: 'por ano',
    badge: 'Economize R$90',
    highlight: true,
  },
]

export default function Subscription() {
  const { isInTrial, daysLeft } = usePremium()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  async function handleSubscribe(plan) {
    setLoading(plan)
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout', {
        body: { appUrl: window.location.origin, plan },
      })
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'Erro desconhecido')
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError('Não foi possível abrir o pagamento. Tente novamente.')
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100dvh - 60px)',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 20px 40px',
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent)', marginBottom: 6 }}>
            GrindUP Premium
          </div>
          {isInTrial ? (
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,87,34,0.12)',
              border: '1px solid rgba(255,87,34,0.3)',
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: '0.82rem',
              color: 'var(--accent)',
              fontWeight: 600,
            }}>
              ⚡ {daysLeft === 0 ? 'Último dia de trial' : `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} de trial restante${daysLeft !== 1 ? 's' : ''}`}
            </div>
          ) : (
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,87,34,0.08)',
              border: '1px solid rgba(255,87,34,0.2)',
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.5)',
            }}>
              Seu período gratuito acabou
            </div>
          )}
        </div>

        {/* Comparativo Grátis vs Premium */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
              GRÁTIS
            </div>
            <div style={{
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--accent)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}>
              PREMIUM ⚡
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ marginTop: 1 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,87,34,0.04)',
            }}>
              {PREMIUM_FEATURES.map(f => (
                <div key={f} style={{ fontSize: '0.82rem', color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ color: 'var(--accent)', marginTop: 1 }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cards de plano */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              style={{
                background: plan.highlight
                  ? 'linear-gradient(135deg, rgba(255,87,34,0.18) 0%, rgba(255,87,34,0.06) 100%)'
                  : 'rgba(255,255,255,0.03)',
                border: plan.highlight
                  ? '1.5px solid var(--accent)'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '16px 18px',
                boxShadow: plan.highlight ? '0 0 28px rgba(255,87,34,0.12)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                    {plan.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: plan.highlight ? 'var(--accent)' : 'var(--text)' }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      {plan.sub}
                    </span>
                  </div>
                </div>
                {plan.badge && (
                  <div style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: '4px 10px',
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: plan.highlight
                    ? (loading === plan.id ? 'rgba(255,87,34,0.4)' : 'linear-gradient(180deg, #ff7a4c 0%, #ff5722 100%)')
                    : 'rgba(255,255,255,0.07)',
                  border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  boxShadow: plan.highlight && loading !== plan.id ? '0 0 18px rgba(255,87,34,0.4)' : 'none',
                  transition: 'all 0.2s',
                  opacity: loading !== null && loading !== plan.id ? 0.5 : 1,
                }}
              >
                {loading === plan.id ? 'Abrindo pagamento…' : `Assinar ${plan.label}`}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,0,0,0.1)',
            border: '1px solid rgba(255,0,0,0.25)',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#ff6b6b',
            fontSize: '0.85rem',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.25)',
          fontSize: '0.75rem',
          lineHeight: 1.6,
        }}>
          Pagamento seguro via Mercado Pago<br />
          PIX, cartão de crédito e boleto • Cancele quando quiser
        </div>
      </div>
    </div>
  )
}
