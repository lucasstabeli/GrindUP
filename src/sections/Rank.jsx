import { useState, useEffect, useRef } from 'react'
import { useUserStore } from '../stores/useUserStore'
import { useGameData, fmt } from '../hooks/useGameData'
import { supabase } from '../lib/supabase'

function Avatar({ url, name, size = 44 }) {
  const letter = (name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent-soft)',
      border: '2px solid var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      fontSize: size * 0.38, fontWeight: 800, color: 'var(--accent)',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : letter}
    </div>
  )
}

function QRModal({ code, onClose }) {
  const canvasRef = useRef(null)
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    // Dynamic import of qrcode - graceful fallback if not installed
    import('qrcode').then(mod => {
      const QRCode = mod.default || mod
      QRCode.toDataURL(code, { width: 220, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrUrl(url))
        .catch(() => {})
    }).catch(() => {
      // qrcode not installed — show code only
    })
  }, [code])

  return (
    <div className="booking-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="booking-sheet" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Seu QR Code</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 16, display: 'block', margin: '0 auto 20px' }} />
        ) : (
          <div style={{
            width: 220, height: 220, borderRadius: 16,
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: '2.5rem' }}>📲</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>QR indisponível</span>
          </div>
        )}

        <div style={{
          background: 'var(--surface-2)', borderRadius: 12,
          padding: '14px 20px', marginBottom: 16,
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Código de convite</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--accent)' }}>{code}</div>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 20 }}>
          Mostre esse código ou QR para seus amigos adicionarem você.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'VidaFit', text: `Meu código de convite: ${code}` })
            } else {
              navigator.clipboard?.writeText(code)
              alert('Código copiado!')
            }
          }}
        >
          Compartilhar código
        </button>
      </div>
    </div>
  )
}

export default function Rank() {
  const { profile } = useUserStore()
  const { D } = useGameData()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [addCode, setAddCode] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Derive invite code from profile
  const myCode = profile?.invite_code || (profile?.id ? profile.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—')

  useEffect(() => {
    if (!profile?.id) return
    loadFriends()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function loadFriends() {
    setLoading(true)
    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', profile.id)

      if (error || !friendships?.length) {
        setFriends([])
        setLoading(false)
        return
      }

      const friendIds = friendships.map(f => f.friend_id)

      const [{ data: profiles }, { data: gameData }] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url').in('id', friendIds),
        supabase.from('user_game_data').select('user_id, data').in('user_id', friendIds),
      ])

      const enriched = (profiles || []).map(p => {
        const gd = (gameData || []).find(g => g.user_id === p.id)?.data || {}
        return {
          id: p.id,
          name: p.name || 'Anônimo',
          avatar_url: p.avatar_url || null,
          coins: gd.coins || 0,
          streak: gd.streak || 0,
        }
      })

      setFriends(enriched)
    } catch {
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  async function addFriend() {
    const code = addCode.trim().toUpperCase()
    if (!code) return
    setAddError('')
    setAddLoading(true)

    try {
      const { data: found, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('invite_code', code)
        .maybeSingle()

      if (error || !found) {
        setAddError('Código não encontrado. Verifique e tente novamente.')
        setAddLoading(false)
        return
      }

      if (found.id === profile.id) {
        setAddError('Esse código é o seu próprio!')
        setAddLoading(false)
        return
      }

      // Add mutual friendship
      await supabase.from('friendships').upsert([
        { user_id: profile.id, friend_id: found.id },
        { user_id: found.id, friend_id: profile.id },
      ], { onConflict: 'user_id,friend_id' })

      setAddCode('')
      setShowAdd(false)
      loadFriends()
    } catch {
      setAddError('Erro ao adicionar amigo. Tente novamente.')
    } finally {
      setAddLoading(false)
    }
  }

  async function removeFriend(friendId) {
    if (!confirm('Remover esse amigo do ranking?')) return
    await supabase.from('friendships').delete()
      .eq('user_id', profile.id).eq('friend_id', friendId)
    setFriends(prev => prev.filter(f => f.id !== friendId))
  }

  // Build leaderboard: me + friends, sorted by coins desc
  const myEntry = {
    id: profile?.id,
    name: profile?.name || 'Você',
    avatar_url: profile?.avatar_url || null,
    coins: D?.coins || 0,
    streak: D?.streak || 0,
    isMe: true,
  }

  const leaderboard = [myEntry, ...friends].sort((a, b) => b.coins - a.coins)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="app-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Ranking</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Compete com seus amigos</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: 'var(--accent)', color: '#000',
            border: 'none', borderRadius: 12,
            padding: '8px 16px', fontSize: '0.82rem',
            fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >+ Amigo</button>
      </div>

      {/* My code card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 16, padding: '14px 16px',
        marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Seu código
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--accent)' }}>
            {myCode}
          </div>
        </div>
        <button
          onClick={() => setShowQR(true)}
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '10px 14px',
            fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>📲</span> QR Code
        </button>
      </div>

      {/* Leaderboard */}
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
        Classificação
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaderboard.map((user, i) => (
            <div
              key={user.id}
              style={{
                background: user.isMe ? 'var(--accent-soft)' : 'var(--surface)',
                border: `1px solid ${user.isMe ? 'var(--accent)' : 'var(--card-border)'}`,
                borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.15s',
              }}
            >
              {/* Position */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i < 3 ? 'transparent' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i < 3 ? '1.3rem' : '0.8rem',
                fontWeight: 800, color: 'var(--muted)',
                flexShrink: 0,
              }}>
                {i < 3 ? medals[i] : i + 1}
              </div>

              <Avatar url={user.avatar_url} name={user.name} size={42} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  color: user.isMe ? 'var(--accent)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.name}{user.isMe && ' ← você'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                  {user.streak}🔥 streak
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)' }}>
                  {fmt(user.coins)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>🪙 moedas</div>
              </div>

              {!user.isMe && (
                <button
                  onClick={() => removeFriend(user.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--muted)', cursor: 'pointer',
                    fontSize: '1.1rem', padding: '4px', lineHeight: 1,
                  }}
                  title="Remover amigo"
                >×</button>
              )}
            </div>
          ))}

          {friends.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏆</div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 6 }}>Nenhum amigo ainda</p>
              <p style={{ fontSize: '0.82rem' }}>Adicione amigos para competir no ranking!</p>
              <button
                onClick={() => setShowAdd(true)}
                className="btn btn-primary"
                style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
              >Adicionar primeiro amigo</button>
            </div>
          )}
        </div>
      )}

      {/* Add friend sheet */}
      {showAdd && (
        <div className="booking-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); setAddError('') } }}>
          <div className="booking-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Adicionar amigo</h3>
              <button onClick={() => { setShowAdd(false); setAddError('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
              Peça o código de 8 letras do seu amigo ou escaneie o QR dele.
            </p>

            <div className="input-group" style={{ marginBottom: 12 }}>
              <label>Código do amigo</label>
              <input
                value={addCode}
                onChange={e => { setAddCode(e.target.value.toUpperCase()); setAddError('') }}
                placeholder="Ex: A1B2C3D4"
                maxLength={10}
                style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '1.1rem', fontWeight: 700 }}
              />
            </div>

            {addError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--danger)', marginBottom: 12 }}>
                {addError}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={addFriend}
              disabled={addLoading || !addCode.trim()}
              style={{ opacity: addLoading || !addCode.trim() ? 0.5 : 1 }}
            >
              {addLoading ? 'Buscando...' : 'Adicionar'}
            </button>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>Quer que ele te adicione? Compartilhe seu código:</p>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--accent)', marginBottom: 10 }}>
                {myCode}
              </div>
              <button
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '8px 18px',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  color: 'var(--text)',
                }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'VidaFit', text: `Me adiciona no VidaFit! Meu código: ${myCode}` })
                  } else {
                    navigator.clipboard?.writeText(myCode)
                    alert('Código copiado!')
                  }
                }}
              >
                Compartilhar meu código
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && <QRModal code={myCode} onClose={() => setShowQR(false)} />}
    </div>
  )
}
