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

// ── QR SCANNER ──
function QRScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        scan()
      } catch {
        setError('Não foi possível acessar a câmera.')
      }
    }

    async function scan() {
      if (!active) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) { rafRef.current = requestAnimationFrame(scan); return }
      if (video.readyState !== video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(scan); return }

      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      try {
        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          if (active) onDetect(code.data)
          return
        }
      } catch {}

      rafRef.current = requestAnimationFrame(scan)
    }

    startCamera()

    return () => {
      active = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="booking-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="booking-sheet" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Escanear QR Code</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {error ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--danger)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📵</div>
            <p style={{ fontSize: '0.9rem' }}>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onClose}>Fechar</button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#000', overflow: 'hidden' }}>
              <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {/* Finder overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 200, height: 200, borderRadius: 16,
                  border: '3px solid var(--accent)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                }} />
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--muted)', padding: '14px 20px' }}>
              Aponte para o QR Code do seu amigo
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── QR SHOW MODAL ──
function QRModal({ code, onClose }) {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    import('qrcode').then(mod => {
      const QRCode = mod.default || mod
      QRCode.toDataURL(code, { width: 220, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrUrl(url))
        .catch(() => {})
    }).catch(() => {})
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
            <div className="spinner" />
          </div>
        )}

        <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Código de convite</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--accent)' }}>{code}</div>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 20 }}>
          Mostre esse QR ou compartilhe o código para seus amigos te adicionarem.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'GrindUP', text: `Me adiciona no GrindUP! Meu código: ${code}` })
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

// ── MAIN COMPONENT ──
export default function Rank() {
  const { profile } = useUserStore()
  const { D } = useGameData()
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])   // incoming requests
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [addCode, setAddCode] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')

  const myCode = profile?.invite_code || (profile?.id ? profile.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—')

  useEffect(() => {
    if (!profile?.id) return
    loadFriends()

    // Reload when user comes back to the tab / app
    const onVisible = () => { if (document.visibilityState === 'visible') loadFriends() }
    document.addEventListener('visibilitychange', onVisible)

    // Also poll every 15s so pending requests appear without manual refresh
    const interval = setInterval(loadFriends, 15000)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function loadFriends() {
    if (!profile?.id) return
    setLoading(true)

    // Safety timeout — never hang forever
    const timer = setTimeout(() => setLoading(false), 8000)

    try {
      const [res1, res2] = await Promise.all([
        supabase.from('friendships').select('friend_id').eq('user_id', profile.id).eq('status', 'accepted'),
        supabase.from('friendships').select('user_id').eq('friend_id', profile.id).eq('status', 'pending'),
      ])

      const friendIds = (res1.data || []).map(f => f.friend_id)
      const pendingIds = (res2.data || []).map(f => f.user_id)
      const allIds = [...new Set([...friendIds, ...pendingIds])]

      if (!allIds.length) {
        setFriends([])
        setPending([])
        return
      }

      const [res3, res4] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url').in('id', allIds),
        supabase.from('user_game_data').select('user_id, data').in('user_id', allIds),
      ])

      function enrich(id) {
        const p = (res3.data || []).find(x => x.id === id) || {}
        const gd = (res4.data || []).find(g => g.user_id === id)?.data || {}
        return { id, name: p.name || 'Anônimo', avatar_url: p.avatar_url || null, coins: gd.coins || 0, streak: gd.streak || 0 }
      }

      setFriends(friendIds.map(enrich))
      setPending(pendingIds.map(enrich))
    } catch (err) {
      console.error('loadFriends:', err)
      setFriends([])
      setPending([])
    } finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }

  async function sendRequest() {
    const code = addCode.trim().toUpperCase()
    if (!code) return
    setAddError('')
    setAddSuccess('')
    setAddLoading(true)

    try {
      const { data: found } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('invite_code', code)
        .maybeSingle()

      if (!found) { setAddError('Código não encontrado.'); setAddLoading(false); return }
      if (found.id === profile.id) { setAddError('Esse código é o seu próprio!'); setAddLoading(false); return }

      // Check if already friends or pending
      const { data: existing } = await supabase
        .from('friendships')
        .select('status')
        .eq('user_id', profile.id)
        .eq('friend_id', found.id)
        .maybeSingle()

      if (existing?.status === 'accepted') { setAddError('Vocês já são amigos!'); setAddLoading(false); return }
      if (existing?.status === 'pending') { setAddError('Pedido já enviado, aguardando resposta.'); setAddLoading(false); return }

      // Check if they already sent me a request → accept directly
      const { data: theirRequest } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', found.id)
        .eq('friend_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (theirRequest) {
        // Accept their request → mutual accepted
        await supabase.from('friendships').update({ status: 'accepted' })
          .eq('user_id', found.id).eq('friend_id', profile.id)
        await supabase.from('friendships').upsert(
          { user_id: profile.id, friend_id: found.id, status: 'accepted' },
          { onConflict: 'user_id,friend_id' }
        )
        setAddSuccess(`Você e ${found.name} agora são amigos! 🎉`)
      } else {
        // Send pending request
        await supabase.from('friendships').upsert(
          { user_id: profile.id, friend_id: found.id, status: 'pending' },
          { onConflict: 'user_id,friend_id' }
        )
        setAddSuccess(`Pedido enviado para ${found.name}! Aguardando aceitação.`)
      }

      setAddCode('')
      loadFriends()
    } catch {
      setAddError('Erro ao enviar pedido. Tente novamente.')
    } finally {
      setAddLoading(false)
    }
  }

  async function acceptRequest(fromId) {
    await supabase.from('friendships').update({ status: 'accepted' })
      .eq('user_id', fromId).eq('friend_id', profile.id)
    await supabase.from('friendships').upsert(
      { user_id: profile.id, friend_id: fromId, status: 'accepted' },
      { onConflict: 'user_id,friend_id' }
    )
    loadFriends()
  }

  async function rejectRequest(fromId) {
    await supabase.from('friendships').delete()
      .eq('user_id', fromId).eq('friend_id', profile.id)
    setPending(prev => prev.filter(p => p.id !== fromId))
  }

  async function removeFriend(friendId) {
    if (!confirm('Remover esse amigo?')) return
    await supabase.from('friendships').delete()
      .eq('user_id', profile.id).eq('friend_id', friendId)
    await supabase.from('friendships').delete()
      .eq('user_id', friendId).eq('friend_id', profile.id)
    setFriends(prev => prev.filter(f => f.id !== friendId))
  }

  function handleQRDetect(data) {
    setShowScanner(false)
    // QR data is the invite code directly
    const extracted = data.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setAddCode(extracted)
    setShowAdd(true)
  }

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadFriends}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '8px 12px', fontSize: '1rem',
              cursor: 'pointer', lineHeight: 1,
            }}
            title="Atualizar"
          >↻</button>
          <button
            onClick={() => { setShowAdd(true); setAddError(''); setAddSuccess('') }}
            style={{
              background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: 12,
              padding: '8px 16px', fontSize: '0.82rem',
              fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >+ Amigo</button>
        </div>
      </div>

      {/* My code card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--card-border)',
        borderRadius: 16, padding: '14px 16px', marginBottom: 20,
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

      {/* Pending requests */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            Pedidos pendentes
            <span style={{ background: 'var(--accent)', color: '#000', borderRadius: 99, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>{pending.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(p => (
              <div key={p.id} style={{
                background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                borderRadius: 16, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Avatar url={p.avatar_url} name={p.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>quer ser seu amigo</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => acceptRequest(p.id)}
                    style={{
                      background: 'var(--accent)', color: '#000',
                      border: 'none', borderRadius: 10, padding: '7px 14px',
                      fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Aceitar</button>
                  <button
                    onClick={() => rejectRequest(p.id)}
                    style={{
                      background: 'var(--surface-2)', color: 'var(--muted)',
                      border: '1px solid var(--line)', borderRadius: 10, padding: '7px 12px',
                      fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Recusar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div key={user.id} style={{
              background: user.isMe ? 'var(--accent-soft)' : 'var(--surface)',
              border: `1px solid ${user.isMe ? 'var(--accent)' : 'var(--card-border)'}`,
              borderRadius: 16, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i < 3 ? 'transparent' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i < 3 ? '1.3rem' : '0.8rem',
                fontWeight: 800, color: 'var(--muted)', flexShrink: 0,
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
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)' }}>{fmt(user.coins)}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>🪙 moedas</div>
              </div>

              {!user.isMe && (
                <button
                  onClick={() => removeFriend(user.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '4px', lineHeight: 1 }}
                  title="Remover amigo"
                >×</button>
              )}
            </div>
          ))}

          {friends.length === 0 && pending.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏆</div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 6 }}>Nenhum amigo ainda</p>
              <p style={{ fontSize: '0.82rem' }}>Adicione amigos para competir no ranking!</p>
              <button
                onClick={() => { setShowAdd(true); setAddError(''); setAddSuccess('') }}
                className="btn btn-primary"
                style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
              >Adicionar primeiro amigo</button>
            </div>
          )}
        </div>
      )}

      {/* Add friend sheet */}
      {showAdd && (
        <div className="booking-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); setAddError(''); setAddSuccess('') } }}>
          <div className="booking-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Adicionar amigo</h3>
              <button onClick={() => { setShowAdd(false); setAddError(''); setAddSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
              Digite o código de 8 letras do seu amigo ou escaneie o QR dele.
            </p>

            {/* QR Scan button */}
            <button
              onClick={() => { setShowAdd(false); setShowScanner(true) }}
              style={{
                width: '100%', padding: '12px', marginBottom: 14,
                background: 'var(--surface-2)', border: '1px solid var(--line)',
                borderRadius: 12, fontSize: '0.88rem', fontWeight: 700,
                color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>📷</span> Escanear QR Code
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <div className="input-group" style={{ marginBottom: 12 }}>
              <label>Código do amigo</label>
              <input
                value={addCode}
                onChange={e => { setAddCode(e.target.value.toUpperCase()); setAddError(''); setAddSuccess('') }}
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

            {addSuccess && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: '#22c55e', marginBottom: 12 }}>
                {addSuccess}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={sendRequest}
              disabled={addLoading || !addCode.trim()}
              style={{ opacity: addLoading || !addCode.trim() ? 0.5 : 1 }}
            >
              {addLoading ? 'Enviando...' : 'Enviar pedido'}
            </button>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>Compartilhe seu código para amigos te adicionarem:</p>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--accent)', marginBottom: 10 }}>{myCode}</div>
              <button
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '8px 18px',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)',
                }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'GrindUP', text: `Me adiciona no GrindUP! Meu código: ${myCode}` })
                  } else {
                    navigator.clipboard?.writeText(myCode)
                    alert('Código copiado!')
                  }
                }}
              >Compartilhar meu código</button>
            </div>
          </div>
        </div>
      )}

      {showQR && <QRModal code={myCode} onClose={() => setShowQR(false)} />}
      {showScanner && <QRScanner onDetect={handleQRDetect} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
