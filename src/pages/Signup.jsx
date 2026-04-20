import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

export default function Signup() {
  const navigate = useNavigate()
  const { setProfile } = useUserStore()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [theme, setTheme] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function previewTheme(t) {
    document.documentElement.setAttribute('data-theme', t)
    setTheme(t)
  }

  function selectGender(g) {
    setGender(g)
    const defaultTheme = g === 'female' ? 'female-dark' : 'male'
    previewTheme(defaultTheme)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!gender) { setError('Selecione seu gênero'); return }
    setError('')
    setLoading(true)

    const finalTheme = theme || (gender === 'female' ? 'female-dark' : 'male')

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, gender, theme: finalTheme },
      },
    })

    setLoading(false)
    if (signupErr) { setError(signupErr.message); return }

    if (data.session) {
      // Email confirmation desativada — usuário já está logado
      navigate('/app')
    } else {
      // Email confirmation ativa — avisar para confirmar
      setError('Cadastro realizado! Verifique seu e-mail para ativar a conta.')
    }
  }

  if (step === 1) {
    return (
      <div className="auth-page">
        <div className="auth-logo">Grind<span style={{ color: '#fff' }}>UP</span></div>
        <p className="auth-subtitle">Crie sua conta</p>
        <form className="auth-form" onSubmit={e => { e.preventDefault(); setStep(2) }}>
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label>Nome completo</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required />
          </div>
          <div className="input-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
          </div>
          <button className="btn btn-primary" type="submit">Próximo →</button>
          <div className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></div>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">VidaFit</div>
      <p className="auth-subtitle">Personalize seu app</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div style={{ width: '100%', maxWidth: 400 }}>
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

          {gender === 'female' && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>Escolha seu tema:</p>
              <div className="theme-preview-row">
                <div className={`theme-chip light ${theme === 'female-light' ? 'selected' : ''}`} onClick={() => previewTheme('female-light')}>
                  🤍 Rosa Claro
                </div>
                <div className={`theme-chip dark-pink ${theme === 'female-dark' ? 'selected' : ''}`} onClick={() => previewTheme('female-dark')}>
                  🖤 Rosa Escuro
                </div>
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading || !gender}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
      </form>
    </div>
  )
}
