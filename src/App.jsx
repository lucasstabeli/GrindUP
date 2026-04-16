import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './stores/useUserStore'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CompleteProfile from './pages/CompleteProfile'
import ClientApp from './pages/ClientApp'
import ProfessionalApp from './pages/ProfessionalApp'

function ProtectedRoute({ children }) {
  const { user, profile } = useUserStore()
  if (!user) return <Navigate to="/login" replace />
  if (user && !profile?.gender) return <Navigate to="/complete-profile" replace />
  return children
}

export default function App() {
  const { user, profile } = useUserStore()

  return (
    <Routes>
      <Route path="/login" element={user && profile?.gender ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/signup" element={user && profile?.gender ? <Navigate to="/app" replace /> : <Signup />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
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
