import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './lib/queryClient'
import { supabase } from './lib/supabase'
import { useUserStore } from './stores/useUserStore'
import './index.css'

// ── AUTO CACHE-BUST ──
// Runs once per device on the v4+ rollout. If an old SW is controlling
// the page (from v3 or earlier), we unregister it, clear caches, and reload.
const BUILD_ID = 'grindup-v4-2026-04-16'
try {
  const marker = localStorage.getItem('grindup_cleanup_v4')
  const hasOldSW = typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && navigator.serviceWorker.controller
  if (marker !== '1' && hasOldSW) {
    localStorage.setItem('grindup_cleanup_v4', '1')
    ;(async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const r of regs) await r.unregister()
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
      } catch {}
      window.location.reload()
    })()
  } else if (marker !== '1') {
    // No old SW to clean — just mark it done
    localStorage.setItem('grindup_cleanup_v4', '1')
  }
  localStorage.setItem('grindup_build_id', BUILD_ID)
} catch {}

// Register SW on load (non-blocking)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Remove boot fallback once React takes over
function hideBootFallback() {
  const fb = document.getElementById('boot-fallback')
  if (fb) fb.remove()
}

supabase.auth.onAuthStateChange(async (event, session) => {
  const { setUser, setProfile, clearUser } = useUserStore.getState()

  if (session?.user) {
    setUser(session.user)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setProfile(profile)
    } else if (event === 'SIGNED_IN') {
      const meta = session.user.user_metadata || {}
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          name: meta.full_name || meta.name || 'Usuário',
          email: session.user.email,
          gender: meta.gender || null,
          theme: meta.theme || null,
          role: 'client',
        })
        .select()
        .single()
      if (newProfile) setProfile(newProfile)
    }
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
