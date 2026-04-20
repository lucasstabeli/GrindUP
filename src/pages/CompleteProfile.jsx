import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

export default function CompleteProfile() {
  const navigate = useNavigate()
  const { user, setProfile } = useUserStore()
  const [gender, setGender] = useState('')
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function selectGender(g) {
    setGender(g)
    const t = g === 'female' ? 'female-dark' : 'male'
    document.documentElement.setAttribute('data-theme', t)
    setTheme(t)
  }

  function previewTheme(t) {
    document.documentElement.setAttribute('data-theme', t)
    setTheme(t)
  }

  async function handleSave() {
    if (!gender) { setError('Selecione seu gênero'); return }
    setLoading(true)
    const finalTheme = theme || (gender === 'female' ? 'female-dark' : 'male')
    const { data, error: err } = await supabase
      .from('profiles')
      .update({ gender, theme: finalTheme })
      .eq('id', user.id)
      .select()
      .single()
    setLoading(false)
    if (err) { setError(err.message); return }
    setProfile(data)
    navigate('/app')
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">Grind<span style={{ color: '#fff' }}>UP</span></div>
      <p className="auth-subtitle">Personalize seu app</p>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <div className="auth-error">{error}</div>}
        <div>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>Qual seu gênero?</p>
          <div className="gender-selector">
            <div className={`gender-option ${gender === 'male' ? 'selected' : ''}`} onClick={() => selectGender('male')}>
              <span className="icon">👨</span>
              <span className="label">Masculino</span>
            </div>
            <div className={`gender-option ${gender === 'female' ? 'selected' : ''}`} onClick={() => selectGender('female')}>
              <span className="icon">👩</span>
              <span className="label">Feminino</span>
            </div>
          </div>
        </div>
        {gender === 'female' && (
          <div>
            <p style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>Escolha seu tema:</p>
            <div className="theme-preview-row">
              <div className={`theme-chip light ${theme === 'female-light' ? 'selected' : ''}`} onClick={() => previewTheme('female-light')}>🤍 Rosa Claro</div>
              <div className={`theme-chip dark-pink ${theme === 'female-dark' ? 'selected' : ''}`} onClick={() => previewTheme('female-dark')}>🖤 Rosa Escuro</div>
            </div>
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={loading || !gender}>
          {loading ? 'Salvando…' : 'Salvar e continuar'}
        </button>
      </div>
    </div>
  )
}
