import { useUserStore } from '../stores/useUserStore'
import TopBar from '../components/layout/TopBar'
import NutritionistPanel from './professional/NutritionistPanel'
import PersonalPanel from './professional/PersonalPanel'
import AestheticianPanel from './professional/AestheticianPanel'

export default function ProfessionalApp() {
  const { profile } = useUserStore()

  const panels = {
    nutritionist: <NutritionistPanel />,
    personal: <PersonalPanel />,
    aesthetician: <AestheticianPanel />,
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <TopBar title="GrindUP Pro" />
      {panels[profile?.role] || (
        <div className="main-content">
          <div className="plan-empty">
            <div className="plan-empty-icon">⚠️</div>
            <h3>Perfil profissional não configurado</h3>
          </div>
        </div>
      )}
    </div>
  )
}
