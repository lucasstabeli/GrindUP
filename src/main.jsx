import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './lib/queryClient'
import { supabase } from './lib/supabase'
import { useUserStore } from './stores/useUserStore'
import './index.css'

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
