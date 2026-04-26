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

// Initialize OneSignal — guarda a promise para aguardar antes de usar
window.__osReady = OneSignal.init({
  appId: 'aeb9dee6-91d7-4806-b7b5-b01f7851d4b7',
  serviceWorkerPath: '/sw.js',
  serviceWorkerParam: { scope: '/' },
  notifyButton: { enable: false },
  welcomeNotification: { disable: true },
}).catch(() => {})

// Background cache cleanup
;(async () => {
  try {
    if (sessionStorage.getItem('grindup_cleaned') === '1') return
    sessionStorage.setItem('grindup_cleaned', '1')
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter(k => k !== 'grindupv11').map(k => caches.delete(k))
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
