import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

const FEATURES = [
  '✅ Missões diárias com recompensas',
  '✅ Streaks e sistema de moedas',
  '✅ Ranking com outros usuários',
  '✅ Cursos de saúde e treino',
  '✅ Agenda e controle de rotina',
  '✅ Loja de recompensas',
]

export default function Subscription({ trialEnd }) {
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isExpired = !trialEnd || new Date(trialEnd) <= new Date()
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout', {
        body: { appUrl: window.location.origin },
      })
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'Erro desconhecido')
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError('Não foi possível abrir o pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>

        {/* Logo */}
        <div style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 900,
          letterSpacing: '-1px',
          color: 'var(--accent)',
          marginBottom: 8,
        }}>
          Grind<span style={{ color: 'var(--text)' }}>UP</span>
        </div>

        {/* Status do trial */}
        {isExpired ? (
          <div style={{
            background: 'rgba(255,87,34,0.12)',
            border: '1px solid rgba(255,87,34,0.3)',
            borderRadius: 12,
            padding: '14px 18px',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>⏰</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
              Seu período gratuito acabou
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 4 }}>
              Continue sua jornada por apenas R$5/mês
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,87,34,0.08)',
            border: '1px solid rgba(255,87,34,0.2)',
            borderRadius: 12,
            padding: '14px 18px',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
              ⚡ {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restante{daysLeft !== 1 ? 's' : ''} no trial
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 4 }}>
              Assine agora e não perca sua sequência
            </div>
          </div>
        )}

        {/* Card de preço */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,87,34,0.15) 0%, rgba(255,87,34,0.05) 100%)',
          border: '1.5px solid var(--accent)',
          borderRadius: 16,
          padding: '24px 20px',
          marginBottom: 20,
          boxShadow: '0 0 32px rgba(255,87,34,0.15)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              fontSize: '2.8rem',
              fontWeight: 900,
              color: 'var(--accent)',
              lineHeight: 1,
            }}>
              R$5
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 2 }}>
              por mês • cancele quando quiser
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ color: 'var(--text)', fontSize: '0.9rem', opacity: 0.9 }}>
                {f}
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,0,0,0.12)',
              border: '1px solid rgba(255,0,0,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#ff6b6b',
              fontSize: '0.85rem',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading
                ? 'rgba(255,87,34,0.4)'
                : 'linear-gradient(180deg, #ff7a4c 0%, #ff5722 100%)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 24px rgba(255,87,34,0.5)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Abrindo pagamento…' : '🔥 Assinar por R$5/mês'}
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.78rem',
          lineHeight: 1.5,
        }}>
          Pagamento seguro via Mercado Pago • PIX, cartão de crédito e boleto
        </div>
      </div>
    </div>
  )
}
