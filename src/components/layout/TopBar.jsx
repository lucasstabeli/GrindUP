import { useState, useRef, useEffect } from 'react'
import { useUserStore } from '../../stores/useUserStore'
import { useNotifications } from '../../hooks/useNotifications'
import { supabase } from '../../lib/supabase'

const IcBell = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
)

function AvatarButton({ profile, onClick }) {
  const letter = (profile?.name || profile?.email || '?')[0].toUpperCase()
  return (
    <button
      className="icon-btn"
      onClick={onClick}
      title="Perfil"
      style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', padding: 0, border: '2px solid var(--accent)' }}
    >
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
          {letter}
        </span>
      )}
    </button>
  )
}

export default function TopBar({ title, onAdmin, isAdmin }) {
  const { profile, setTheme, setProfile } = useUserStore()
  const { permission, subStatus, subError, enabled, times, requestPermission, subscribePush, toggleEnabled, setTimes, testPush, testLocalNotification, testLocalDelayed, testRemoteDelayed, getDiagnostics, resetPushSystem, getLog, clearLog } = useNotifications()
  const [showLogs, setShowLogs] = useState(false)
  const [logData, setLogData] = useState([])

  useEffect(() => {
    if (!showLogs) return
    setLogData(getLog())
    const id = setInterval(() => setLogData(getLog()), 1500)
    return () => clearInterval(id)
  }, [showLogs, getLog])
  const [testingPush, setTestingPush] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [showDiag, setShowDiag] = useState(false)
  const [diagData, setDiagData] = useState(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown(v => v - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  useEffect(() => {
    if (!showDiag) return
    let active = true
    getDiagnostics().then(d => { if (active) setDiagData(d) }).catch(() => {})
    return () => { active = false }
  }, [showDiag, getDiagnostics])

  const [showTheme, setShowTheme] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const dropRef = useRef(null)
  const fileRef = useRef(null)
  const isFemale = profile?.gender === 'female'

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowTheme(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function changeTheme(t) {
    setTheme(t)
    setShowTheme(false)
    if (profile?.id) {
      await supabase.from('profiles').update({ theme: t }).eq('id', profile.id)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function forceReset() {
    if (!confirm('Isso vai limpar o cache e reinstalar o app. Continuar?')) return
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const r of regs) await r.unregister()
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      // Preserve auth but drop everything else
      const authKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
      const preserved = {}
      for (const k of authKeys) preserved[k] = localStorage.getItem(k)
      localStorage.clear()
      for (const k in preserved) localStorage.setItem(k, preserved[k])
    } catch (e) {
      console.error('reset error', e)
    }
    window.location.href = '/?_r=' + Date.now()
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || !profile?.id) return
    setSavingName(true)
    await supabase.from('profiles').update({ name: trimmed }).eq('id', profile.id)
    setProfile({ ...profile, name: trimmed })
    setEditingName(false)
    setSavingName(false)
  }

  function updateTime(idx, val) {
    const next = [...times]
    next[idx] = val
    setTimes(next)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploading(true)
    try {
      // Compress/resize if too large (basic size check)
      const path = `${profile.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const avatarUrl = urlData.publicUrl + '?t=' + Date.now()

      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: avatarUrl })
      setShowProfile(false)
    } catch (err) {
      alert('Erro ao fazer upload da foto. Tente novamente.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function removeAvatar() {
    if (!profile?.id) return
    if (!confirm('Remover foto de perfil?')) return
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: null })
    setShowProfile(false)
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-logo">
          {title || <>Grind<span style={{ color: '#fff' }}>UP</span></>}
        </span>
        <div className="topbar-actions" ref={dropRef}>

          {/* Notifications */}
          <button
            className={`icon-btn ${enabled ? 'active' : ''}`}
            onClick={() => setShowNotif(true)}
            title="Notificações"
          >
            <IcBell />
          </button>

          {/* Theme (female only) */}
          {isFemale && (
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setShowTheme(v => !v)} title="Trocar tema">🎨</button>
              {showTheme && (
                <div className="theme-dropdown">
                  <div className={`theme-dropdown-item ${profile?.theme === 'female-light' ? 'active' : ''}`} onClick={() => changeTheme('female-light')}>
                    🤍 Rosa Claro
                  </div>
                  <div className={`theme-dropdown-item ${profile?.theme === 'female-dark' ? 'active' : ''}`} onClick={() => changeTheme('female-dark')}>
                    🖤 Rosa Escuro
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {onAdmin && (
            <button className="icon-btn" onClick={onAdmin} title={isAdmin ? 'Voltar' : 'Configurações'}>
              {isAdmin
                ? <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>}
            </button>
          )}

          {/* Avatar / Profile */}
          <AvatarButton profile={profile} onClick={() => setShowProfile(true)} />
        </div>
      </div>

      {/* ── PROFILE SHEET ── */}
      {showProfile && (
        <div
          className="booking-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowProfile(false) }}
        >
          <div className="booking-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Perfil</h3>
              <button onClick={() => { setShowProfile(false); setEditingName(false) }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, gap: 10 }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'var(--accent-soft)', border: '3px solid var(--accent)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent)' }}>
                    {(profile?.name || profile?.email || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              {uploading && <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Enviando foto...</div>}
            </div>

            {/* Name edit */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Nome</div>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus
                    maxLength={40}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: '1px solid var(--accent)', background: 'var(--surface-2)',
                      color: 'var(--text)', fontSize: '0.95rem', fontWeight: 700,
                      fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName || !nameValue.trim()}
                    style={{
                      background: 'var(--accent)', color: '#000', border: 'none',
                      borderRadius: 10, padding: '0 16px', fontWeight: 800,
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
                      opacity: savingName ? 0.6 : 1,
                    }}
                  >{savingName ? '...' : 'Salvar'}</button>
                  <button
                    onClick={() => setEditingName(false)}
                    style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 10, padding: '0 10px', color: 'var(--muted)', cursor: 'pointer' }}
                  >✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{profile?.name || 'Sem nome'}</span>
                  <button
                    onClick={() => { setNameValue(profile?.name || ''); setEditingName(true) }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >✏️ Editar</button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              <button
                className="btn btn-primary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ opacity: uploading ? 0.6 : 1 }}
              >
                📷 Tirar foto / Escolher da galeria
              </button>

              {profile?.avatar_url && (
                <button
                  className="btn btn-ghost"
                  onClick={removeAvatar}
                  disabled={uploading}
                >
                  Remover foto
                </button>
              )}

              <button
                className="btn"
                onClick={forceReset}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--accent)', marginTop: 8, textTransform: 'none', letterSpacing: 0, fontWeight: 800 }}
              >
                🔄 Forçar atualização do app
              </button>

              <button
                className="btn"
                onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--danger)', textTransform: 'none', letterSpacing: 0 }}
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS PANEL ── */}
      {showNotif && (
        <div className="booking-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowNotif(false); setTestResult('') } }}>
          <div className="booking-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Notificações</h3>
              <button onClick={() => { setShowNotif(false); setTestResult('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* iOS tip */}
            {/iphone|ipad|ipod/i.test(navigator.userAgent) && subStatus !== 'subscribed' && (
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#60a5fa' }}>
                iPhone: certifique-se que abriu pelo <strong>ícone instalado</strong> na Tela de Início, não pelo Safari.
              </div>
            )}

            {/* Status badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: subStatus === 'subscribed' ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)',
              border: `1px solid ${subStatus === 'subscribed' ? 'rgba(34,197,94,0.3)' : 'var(--line)'}`,
            }}>
              <span style={{ fontSize: '1rem' }}>
                {subStatus === 'subscribed' ? '✅' : subStatus === 'subscribing' ? '⏳' : subStatus === 'error' ? '❌' : '⭕'}
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: subStatus === 'subscribed' ? '#22c55e' : 'var(--muted)' }}>
                {subStatus === 'subscribed' ? 'Push ativo — receberá notificações em segundo plano' :
                  subStatus === 'subscribing' ? 'Ativando...' :
                  subStatus === 'error' ? (subError || 'Erro ao ativar push') :
                  'Push não ativado'}
              </span>
            </div>

            {/* Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ativar lembretes</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>Notificações nos horários abaixo</div>
              </div>
              <button
                onClick={() => toggleEnabled(!enabled)}
                style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: enabled ? 'var(--accent)' : 'var(--surface-3)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: enabled ? 25 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>

            {/* Manual subscribe button if not subscribed */}
            {subStatus !== 'subscribed' && (
              <button
                className="btn btn-primary"
                onClick={() => { subscribePush() }}
                disabled={subStatus === 'subscribing'}
                style={{ marginBottom: 16, opacity: subStatus === 'subscribing' ? 0.6 : 1 }}
              >
                {subStatus === 'subscribing' ? '⏳ Ativando...' : '🔔 Ativar notificações push'}
              </button>
            )}

            {/* Times */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Horários</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {times.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="time" value={t} onChange={e => updateTime(i, e.target.value)}
                      style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)', fontSize: '1rem', padding: '10px 12px', fontFamily: 'inherit', outline: 'none' }} />
                    {times.length > 1 && (
                      <button onClick={() => setTimes(times.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                    )}
                  </div>
                ))}
                {times.length < 4 && (
                  <button onClick={() => setTimes([...times, '12:00'])} className="btn"
                    style={{ background: 'var(--surface-2)', color: 'var(--muted)', border: '1px dashed var(--line)', textTransform: 'none', letterSpacing: 0, padding: '10px', fontSize: '0.85rem' }}>
                    + Adicionar horário
                  </button>
                )}
              </div>
            </div>

            {/* Test button */}
            {testResult && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, fontSize: '0.85rem', fontWeight: 700,
                background: (testResult === 'ok' || testResult === 'localOk') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: (testResult === 'ok' || testResult === 'localOk') ? '#22c55e' : 'var(--danger)',
                border: `1px solid ${(testResult === 'ok' || testResult === 'localOk') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                {testResult === 'ok'
                  ? '✅ Notificação enviada pelo servidor! Feche o app e aguarde até 30s.'
                  : testResult === 'localOk'
                    ? '✅ Notificação local disparada. Se você não viu nada, é problema do iOS (Ajustes > GrindUP > Notificações).'
                    : testResult === 'noRecipients'
                      ? '❌ Dispositivo não registrado no OneSignal. Desinstale o app e instale de novo pela Tela de Início.'
                      : '❌ ' + testResult}
              </div>
            )}
            <button
              className="btn"
              onClick={async () => {
                setTestingPush(true)
                setTestResult('')
                const result = await testPush()
                setTestResult(result === true ? 'ok' : result === 'noRecipients' ? 'noRecipients' : typeof result === 'string' ? result : 'Falhou')
                setTestingPush(false)
              }}
              disabled={testingPush}
              style={{
                width: '100%', background: 'var(--accent-soft)', color: 'var(--accent)',
                border: '1px solid var(--accent)', padding: '12px', borderRadius: 10,
                fontSize: '0.9rem', fontWeight: 700, textTransform: 'none', letterSpacing: 0,
                cursor: testingPush ? 'wait' : 'pointer', opacity: testingPush ? 0.6 : 1,
              }}
            >
              {testingPush ? '⏳ Enviando...' : '📲 Testar notificação (servidor)'}
            </button>

            {/* Teste local — verifica se iOS+SW estão OK sem passar pelo OneSignal */}
            <button
              className="btn"
              onClick={async () => {
                setTestResult('')
                const result = await testLocalNotification()
                setTestResult(result === true ? 'localOk' : typeof result === 'string' ? result : 'Falhou')
              }}
              style={{
                width: '100%', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--line)', padding: '10px', borderRadius: 10,
                fontSize: '0.82rem', fontWeight: 700, textTransform: 'none', letterSpacing: 0,
                cursor: 'pointer', marginTop: 8,
              }}
            >
              🧪 Testar notificação local (sem servidor)
            </button>

            {/* Testes com DELAY — feche o app durante o countdown */}
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10 }}>
              <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                ⚠️ iOS NÃO mostra banner com app aberto
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 10, textAlign: 'center' }}>
                Aperte um botão e <strong>FECHE O APP</strong> (swipe up) durante o countdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => {
                    setTestResult('')
                    setCountdown(10)
                    testLocalDelayed(10)
                  }}
                  disabled={countdown > 0}
                  style={{
                    width: '100%', background: 'var(--surface-2)', color: 'var(--text)',
                    border: '1px solid var(--line)', padding: '10px', borderRadius: 8,
                    fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                    cursor: countdown > 0 ? 'wait' : 'pointer', opacity: countdown > 0 ? 0.6 : 1,
                  }}
                >
                  {countdown > 0 ? `⏳ Disparando em ${countdown}s — FECHE O APP!` : '🧪 Local em 10s'}
                </button>
                <button
                  onClick={() => {
                    setTestResult('')
                    setCountdown(10)
                    testRemoteDelayed(10)
                  }}
                  disabled={countdown > 0}
                  style={{
                    width: '100%', background: 'var(--surface-2)', color: 'var(--text)',
                    border: '1px solid var(--line)', padding: '10px', borderRadius: 8,
                    fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                    cursor: countdown > 0 ? 'wait' : 'pointer', opacity: countdown > 0 ? 0.6 : 1,
                  }}
                >
                  {countdown > 0 ? `⏳ Disparando em ${countdown}s — FECHE O APP!` : '📲 Servidor em 10s'}
                </button>
              </div>
            </div>

            {/* Reset nuclear — quando estado fica travado */}
            <button
              onClick={async () => {
                if (!confirm('Vai desregistrar tudo, limpar cache e recarregar. Continuar?')) return
                await resetPushSystem()
              }}
              style={{
                width: '100%', background: 'transparent', color: 'var(--danger)',
                border: '1px solid var(--danger)', padding: '10px', borderRadius: 10,
                fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', marginTop: 12, textTransform: 'none', letterSpacing: 0,
              }}
            >
              ☢️ Reset completo (se travou em "ativando")
            </button>

            {/* Diagnóstico */}
            <button
              onClick={() => setShowDiag(v => !v)}
              style={{
                width: '100%', background: 'transparent', color: 'var(--muted)',
                border: 'none', padding: '8px', fontSize: '0.72rem',
                fontFamily: 'inherit', cursor: 'pointer', marginTop: 4, textDecoration: 'underline',
              }}
            >
              {showDiag ? 'Ocultar' : 'Mostrar'} diagnóstico
            </button>
            {showDiag && (
              <pre style={{
                background: 'var(--surface-2)', border: '1px solid var(--line)',
                borderRadius: 8, padding: 10, fontSize: '0.7rem', color: 'var(--muted)',
                overflow: 'auto', maxHeight: 240, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>{diagData ? JSON.stringify(diagData, null, 2) : 'Carregando diagnóstico...'}</pre>
            )}

            {/* LOGS PERSISTENTES — mostra exatamente onde falhou */}
            <button
              onClick={() => setShowLogs(v => !v)}
              style={{
                width: '100%', background: 'transparent', color: '#f59e0b',
                border: 'none', padding: '8px', fontSize: '0.78rem',
                fontFamily: 'inherit', cursor: 'pointer', marginTop: 4, textDecoration: 'underline',
                fontWeight: 700,
              }}
            >
              {showLogs ? 'Ocultar' : '🔍 MOSTRAR'} logs detalhados ({logData.length || getLog().length})
            </button>
            {showLogs && (
              <div>
                <button
                  onClick={() => { clearLog(); setLogData([]) }}
                  style={{
                    background: 'transparent', color: 'var(--danger)',
                    border: '1px solid var(--danger)', borderRadius: 6,
                    padding: '4px 10px', fontSize: '0.7rem', fontFamily: 'inherit',
                    cursor: 'pointer', marginBottom: 6,
                  }}
                >Limpar logs</button>
                <pre style={{
                  background: '#000', color: '#0f0', border: '1px solid var(--line)',
                  borderRadius: 8, padding: 10, fontSize: '0.65rem',
                  overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{logData.map(e => `${e.t} ${e.msg}${e.data ? ': ' + e.data : ''}`).join('\n') || '(vazio — ative as notificações pra gerar logs)'}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
