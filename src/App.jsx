import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from './stores/useUserStore'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CompleteProfile from './pages/CompleteProfile'
import ClientApp from './pages/ClientApp'
import ProfessionalApp from './pages/ProfessionalApp'

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee', background: '#080809', fontWeight: 800 }}>
      Carregando...
    </div>
  )
}

function ProtectedRoute({ children, authReady }) {
  const { user, profile } = useUserStore()
  if (!authReady) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  // User is logged in but profile not loaded yet from Supabase → wait
  if (user && !profile) return <LoadingScreen />
  if (user && !profile?.gender) return <Navigate to="/complete-profile" replace />
  return children
}

export default function App() {
  const { user, profile, setProfile } = useUserStore()
  const [authReady, setAuthReady] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Quando MP redireciona de volta após pagamento, recarrega o perfil
  useEffect(() => {
    const sub = searchParams.get('sub')
    if (sub === 'success' && user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile(data)
        })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, user])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(() => {
      if (mounted) setAuthReady(true)
    }).catch(() => {
      if (mounted) setAuthReady(true)
    })
    const t = setTimeout(() => { if (mounted) setAuthReady(true) }, 3000)
    return () => { mounted = false; clearTimeout(t) }
  }, [])

  // Load profile outside the auth lock context — calling supabase.from() inside
  // onAuthStateChange causes a deadlock (see main.jsx), so we do it here instead.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadProfile() {
      const { data: existing } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (cancelled) return

      if (existing) { setProfile(existing); return }

      // Profile missing → create it (new OAuth/email signup)
      const meta = user.user_metadata || {}
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('profiles').insert({
        id: user.id,
        name: meta.full_name || meta.name || 'Usuário',
        email: user.email,
        gender: meta.gender || null,
        theme: meta.theme || null,
        role: 'client',
        trial_ends_at: trialEnd,
        subscription_status: 'trial',
      }).select().single()
      if (cancelled) return

      // Fetch again — handles both fresh insert and race-condition insert failure
      const { data: retry } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (cancelled) return
      if (retry) setProfile(retry)
    }

    loadProfile().catch(console.error)
    return () => { cancelled = true }
  }, [user?.id])

  if (!authReady) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={user && profile?.gender ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/signup" element={user && profile?.gender ? <Navigate to="/app" replace /> : <Signup />} />
      <Route path="/complete-profile" element={user && profile && !profile.gender ? <CompleteProfile /> : <Navigate to="/app" replace />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute authReady={authReady}>
            {profile?.role && ['nutritionist', 'personal', 'aesthetician'].includes(profile.role)
              ? <ProfessionalApp />
              : <ClientApp />
            }
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
