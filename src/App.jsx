import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
  const { user, profile } = useUserStore()
  const [authReady, setAuthReady] = useState(false)

  // Wait for Supabase to tell us whether we have a session or not.
  // This prevents the initial flash of "complete-profile" when we have
  // a session but profile hasn't been fetched yet.
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(() => {
      if (mounted) setAuthReady(true)
    }).catch(() => {
      if (mounted) setAuthReady(true)
    })
    // Safety: even if getSession never resolves, unblock after 3s
    const t = setTimeout(() => { if (mounted) setAuthReady(true) }, 3000)
    return () => { mounted = false; clearTimeout(t) }
  }, [])

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
