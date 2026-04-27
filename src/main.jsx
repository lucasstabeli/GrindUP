import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import OneSignal from 'react-onesignal'
import App from './App'
import { queryClient } from './lib/queryClient'
import { supabase } from './lib/supabase'
import { useUserStore } from './stores/useUserStore'
import './index.css'

// Logger persistente
function _pLog(msg, data) {
  try {
    const t = new Date().toISOString().slice(11, 19)
    const entry = { t, msg, data: data === undefined ? null : (typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200)) }
    const existing = JSON.parse(localStorage.getItem('grindupPushLog') || '[]')
    existing.push(entry)
    if (existing.length > 80) existing.splice(0, existing.length - 80)
    localStorage.setItem('grindupPushLog', JSON.stringify(existing))
    console.log('[boot]', t, msg, data ?? '')
  } catch {}
}

// Registra o SW manualmente ANTES do OneSignal
window.__swReady = (async () => {
  _pLog('boot: iniciando')
  if (!('serviceWorker' in navigator)) { _pLog('boot: sem SW support'); return null }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    _pLog('SW registrado', { scope: reg.scope, scriptURL: reg.active?.scriptURL || reg.installing?.scriptURL })
    if (reg.installing) {
      _pLog('SW instalando, aguardando activate')
      await new Promise(resolve => {
        const t = setTimeout(resolve, 10000)
        reg.installing.addEventListener('statechange', e => {
          _pLog('SW state', e.target.state)
          if (e.target.state === 'activated') { clearTimeout(t); resolve() }
        })
      })
    }
    _pLog('SW pronto')
    return reg
  } catch (err) {
    _pLog('SW FALHOU', err?.message)
    return null
  }
})()

window.__osReady = window.__swReady.then(() => {
  _pLog('OneSignal.init() chamado')
  return OneSignal.init({
    appId: 'aeb9dee6-91d7-4806-b7b5-b01f7851d4b7',
    serviceWorkerPath: '/sw.js',
    serviceWorkerParam: { scope: '/' },
    notifyButton: { enable: false },
    welcomeNotification: { disable: true },
  })
}).then(() => {
  _pLog('OneSignal init OK', {
    optedIn: window.OneSignal?.User?.PushSubscription?.optedIn,
    id: window.OneSignal?.User?.PushSubscription?.id,
    hasToken: !!window.OneSignal?.User?.PushSubscription?.token,
  })
}).catch(err => {
  _pLog('OneSignal init FALHOU', err?.message)
})

// Background cache cleanup
;(async () => {
  try {
    if (sessionStorage.getItem('grindup_cleaned') === '1') return
    sessionStorage.setItem('grindup_cleaned', '1')
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter(k => k !== 'grindupv18').map(k => caches.delete(k))
      )
    }
  } catch {}
})()


// Remove boot fallback once React takes over
function hideBootFallback() {
  const fb = document.getElementById('boot-fallback')
  if (fb) fb.remove()
}

// WARNING: never call supabase.from() or supabase.auth.getSession() inside this
// callback — those methods acquire the auth lock internally, but the callback
// already runs inside the lock (lockAcquired=true), causing a permanent deadlock.
// Profile loading is handled by App.jsx's useEffect instead.
supabase.auth.onAuthStateChange((event, session) => {
  const { setUser, clearUser } = useUserStore.getState()
  if (session?.user) {
    setUser(session.user)
  } else {
    clearUser()
  }
})

try {
  hideBootFallback()
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
} catch (err) {
  // Surface boot errors to the fallback UI
  const eb = document.getElementById('boot-error')
  const btn = document.getElementById('boot-reset')
  if (eb) { eb.style.display = 'block'; eb.textContent = String(err?.message || err) }
  if (btn) btn.style.display = 'inline-block'
}
