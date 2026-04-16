import { useUserStore } from '../stores/useUserStore'
import { useMyWorkoutPlan } from '../hooks/useWorkoutPlan'
import { useMyDietPlan } from '../hooks/useDietPlan'

export default function Home({ onNavigate }) {
  const { profile } = useUserStore()
  const { data: workout } = useMyWorkoutPlan()
  const { data: diet } = useMyDietPlan()

  const firstName = profile?.name?.split(' ')[0] || 'Usuário'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const workoutDays = workout?.content?.days?.length || 0
  const mealCount = diet?.content?.meals?.length || 0

  return (
    <div className="main-content">
      <div className="hero-card">
        <p className="greeting">{greeting},</p>
        <h2>{firstName} 👋</h2>
        <p className="hero-sub">Seu plano de saúde personalizado está aqui</p>
      </div>

      <div className="stats-row">
        <div className="stat-card" onClick={() => onNavigate('treino')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">💪</div>
          <div className="stat-value">{workoutDays}</div>
          <div className="stat-label">Dias de treino</div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('dieta')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">🥗</div>
          <div className="stat-value">{mealCount}</div>
          <div className="stat-label">Refeições no plano</div>
        </div>
      </div>

      {workout?.content?.days?.[0] && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-header">
            <h3>Próximo treino</h3>
            <button onClick={() => onNavigate('treino')}>Ver tudo</button>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
              {workout.content.days[0].name}
            </div>
            {workout.content.days[0].exercises?.slice(0, 3).map((ex, i) => (
              <div key={i} className="exercise-item">
                <span className="exercise-name">{ex.name}</span>
                <span className="exercise-sets">{ex.sets}x{ex.reps}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {diet?.content?.meals?.[0] && (
        <div>
          <div className="section-header">
            <h3>Próxima refeição</h3>
            <button onClick={() => onNavigate('dieta')}>Ver tudo</button>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
              {diet.content.meals[0].time} — {diet.content.meals[0].name}
            </div>
            {diet.content.meals[0].items?.slice(0, 3).map((item, i) => (
              <div key={i} className="meal-item">
                <span className="meal-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!workout && !diet && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌱</div>
          <h3 style={{ marginBottom: 8 }}>Comece sua jornada</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 16 }}>
            Encontre um profissional e agende sua consulta
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('profissionais')}>
            Ver Profissionais
          </button>
        </div>
      )}
    </div>
  )
}
