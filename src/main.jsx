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
// Bump this whenever we deploy a breaking change. If the installed PWA
// is running an older BUILD_ID, we nuke the SW + caches and reload once.
const BUILD_ID = 'grindup-v4-2026-04-16'
;(async function checkBuildVersion() {
  try {
    const stored = localStorage.getItem('grindup_build_id')
    if (stored !== BUILD_ID) {
      localStorage.setItem('grindup_build_id', BUILD_ID)
      if (stored) {
        // Was a prior version — force refresh everything
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          for (const r of regs) await r.unregister()
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
        window.location.reload()
        return
      }
    }
  } catch {}
})()

// Register SW fresh (after any reset above)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
