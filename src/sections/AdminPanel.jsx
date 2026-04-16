import { useState } from 'react'
import { useGameData, DEFAULT_GAME, ALL_DAYS, DAY_NAMES_SHORT } from '../hooks/useGameData'

const SECTION_TABS = [
  { id: 'missoes', label: 'Missões' },
  { id: 'cursos',  label: 'Cursos' },
  { id: 'loja',    label: 'Loja' },
  { id: 'rotina',  label: 'Rotina' },
  { id: 'agua',    label: 'Água' },
]

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function DayPicker({ days, onChange }) {
  const active = days ?? ALL_DAYS
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
        Dias da semana
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {DAY_LABELS.map((label, i) => {
          const on = active.includes(i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = on ? active.filter(d => d !== i) : [...active, i].sort((a, b) => a - b)
                onChange(next)
              }}
              style={{
                flex: 1, padding: '7px 2px',
                borderRadius: 10,
                border: on ? '1.5px solid var(--accent)' : '1.5px solid var(--line)',
                background: on ? 'var(--accent)' : 'var(--surface-2)',
                color: on ? '#000' : 'var(--muted)',
                fontSize: '0.62rem', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >{label.slice(0, 1)}</button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const { D, save } = useGameData()
  const [tab, setTab] = useState('missoes')

  if (!D) return null

  function resetAll() {
    if (!confirm('Resetar TODOS os dados do jogo? Isso apaga moedas, progresso e tarefas.')) return
    save(JSON.parse(JSON.stringify(DEFAULT_GAME)))
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: 16 }}>
        <h2>⚙️ Configurações</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Personalize seu app</p>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {SECTION_TABS.map(t => (
          <button key={t.id} className={`filter-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'missoes' && <MissoesConfig D={D} save={save} />}
      {tab === 'cursos'  && <CursosConfig D={D} save={save} />}
      {tab === 'loja'    && <LojaConfig D={D} save={save} />}
      {tab === 'rotina'  && <RotinaConfig D={D} save={save} />}
      {tab === 'agua'    && <AguaConfig D={D} save={save} />}

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-danger" style={{ width: '100%' }} onClick={resetAll}>
          🗑 Resetar todos os dados
        </button>
      </div>
    </div>
  )
}

/* ─── Missões ─── */
function MissoesConfig({ D, save }) {
  const [editKaffa, setEditKaffa] = useState(false)
  const [kf, setKf] = useState(D.kaffa)
  const [editIdx, setEditIdx] = useState(null)
  const [taskForm, setTaskForm] = useState({})
  const [newTask, setNewTask] = useState(false)
  const [ntf, setNtf] = useState({ emoji: '⭐', title: '', desc: '', reward: 20, penalty: 10, days: ALL_DAYS })

  function saveKaffa(e) {
    e.preventDefault()
    save({ ...D, kaffa: { ...D.kaffa, name: kf.name, desc: kf.desc, reward: Number(kf.reward), penalty: Number(kf.penalty) } })
    setEditKaffa(false)
  }

  function startEditTask(i) {
    setEditIdx(i)
    setTaskForm({ ...D.tasks[i], days: D.tasks[i].days ?? ALL_DAYS })
  }

  function saveTask(e) {
    e.preventDefault()
    const tasks = D.tasks.map((t, i) => i === editIdx
      ? { ...t, ...taskForm, reward: Number(taskForm.reward), penalty: Number(taskForm.penalty) }
      : t)
    save({ ...D, tasks })
    setEditIdx(null)
  }

  function removeTask(i) {
    save({ ...D, tasks: D.tasks.filter((_, j) => j !== i) })
  }

  function addTask(e) {
    e.preventDefault()
    const t = { ...ntf, reward: Number(ntf.reward), penalty: Number(ntf.penalty), state: 'idle' }
    save({ ...D, tasks: [...D.tasks, t] })
    setNtf({ emoji: '⭐', title: '', desc: '', reward: 20, penalty: 10, days: ALL_DAYS })
    setNewTask(false)
  }

  return (
    <div>
      {/* Kaffa */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontWeight: 700 }}>👑 Super Missão</p>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', width: 'auto' }} onClick={() => { setKf(D.kaffa); setEditKaffa(v => !v) }}>
            {editKaffa ? 'Cancelar' : 'Editar'}
          </button>
        </div>
        {editKaffa ? (
          <form className="card" onSubmit={saveKaffa}>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label>Nome</label>
              <input value={kf.name} onChange={e => setKf(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label>Descrição</label>
              <input value={kf.desc} onChange={e => setKf(f => ({ ...f, desc: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>🪙 Recompensa</label>
                <input type="number" min="0" value={kf.reward} onChange={e => setKf(f => ({ ...f, reward: e.target.value }))} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>💀 Penalidade</label>
                <input type="number" min="0" value={kf.penalty} onChange={e => setKf(f => ({ ...f, penalty: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Salvar</button>
          </form>
        ) : (
          <div className="card" style={{ opacity: 0.8 }}>
            <strong>{D.kaffa.name}</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>{D.kaffa.desc}</p>
            <p style={{ fontSize: '0.8rem', marginTop: 6 }}>+{D.kaffa.reward} 🪙 · -{D.kaffa.penalty} 🪙 penalidade</p>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontWeight: 700 }}>Missões diárias</p>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => setNewTask(v => !v)}>
          {newTask ? '✕' : '+ Nova'}
        </button>
      </div>

      {newTask && (
        <form className="card" style={{ marginBottom: 12 }} onSubmit={addTask}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div className="input-group" style={{ width: 64 }}>
              <label>Emoji</label>
              <input value={ntf.emoji} onChange={e => setNtf(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Título</label>
              <input value={ntf.title} onChange={e => setNtf(f => ({ ...f, title: e.target.value }))} required />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 8 }}>
            <label>Descrição</label>
            <input value={ntf.desc} onChange={e => setNtf(f => ({ ...f, desc: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>🪙 Recompensa</label>
              <input type="number" min="0" value={ntf.reward} onChange={e => setNtf(f => ({ ...f, reward: e.target.value }))} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>💀 Penalidade</label>
              <input type="number" min="0" value={ntf.penalty} onChange={e => setNtf(f => ({ ...f, penalty: e.target.value }))} />
            </div>
          </div>
          <DayPicker days={ntf.days} onChange={days => setNtf(f => ({ ...f, days }))} />
          <button className="btn btn-primary" type="submit">Adicionar</button>
        </form>
      )}

      {D.tasks.map((t, i) => (
        <div key={i}>
          {editIdx === i ? (
            <form className="card" style={{ marginBottom: 10 }} onSubmit={saveTask}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div className="input-group" style={{ width: 64 }}>
                  <label>Emoji</label>
                  <input value={taskForm.emoji} onChange={e => setTaskForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Título</label>
                  <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 8 }}>
                <label>Descrição</label>
                <input value={taskForm.desc} onChange={e => setTaskForm(f => ({ ...f, desc: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>🪙 Recompensa</label>
                  <input type="number" min="0" value={taskForm.reward} onChange={e => setTaskForm(f => ({ ...f, reward: e.target.value }))} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>💀 Penalidade</label>
                  <input type="number" min="0" value={taskForm.penalty} onChange={e => setTaskForm(f => ({ ...f, penalty: e.target.value }))} />
                </div>
              </div>
              <DayPicker days={taskForm.days} onChange={days => setTaskForm(f => ({ ...f, days }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Salvar</button>
                <button className="btn btn-ghost" type="button" style={{ flex: 1 }} onClick={() => setEditIdx(null)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                    +{t.reward} 🪙 · -{t.penalty || 0} penalidade
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 3 }}>
                    {(t.days ?? ALL_DAYS).map(d => DAY_NAMES_SHORT[d].slice(0, 3)).join(' · ')}
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', width: 'auto' }} onClick={() => startEditTask(i)}>✏️</button>
                <button className="btn btn-danger" style={{ padding: '6px 10px', width: 'auto' }} onClick={() => removeTask(i)}>🗑</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Cursos Config ─── */
function CursosConfig({ D, save }) {
  const [form, setForm] = useState({ emoji: '📚', name: '', total: '', done: '', cpp: 20 })

  function submit(e) {
    e.preventDefault()
    const c = { emoji: form.emoji || '📚', name: form.name, total: Math.max(1, Number(form.total)), done: Math.max(0, Number(form.done) || 0), cpp: Number(form.cpp) || 20 }
    save({ ...D, courses: [...D.courses, c] })
    setForm({ emoji: '📚', name: '', total: '', done: '', cpp: 20 })
  }

  function remove(i) {
    save({ ...D, courses: D.courses.filter((_, j) => j !== i) })
  }

  return (
    <div>
      <form className="card" style={{ marginBottom: 16 }} onSubmit={submit}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Adicionar curso</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div className="input-group" style={{ width: 64 }}>
            <label>Emoji</label>
            <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Nome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Total</label>
            <input type="number" min="1" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} required />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Feitas</label>
            <input type="number" min="0" value={form.done} onChange={e => setForm(f => ({ ...f, done: e.target.value }))} />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>🪙/aula</label>
            <input type="number" min="0" value={form.cpp} onChange={e => setForm(f => ({ ...f, cpp: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Adicionar</button>
      </form>

      {D.courses.map((c, i) => (
        <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{c.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.done}/{c.total} aulas · +{c.cpp}🪙/aula</div>
          </div>
          <button className="btn btn-danger" style={{ padding: '6px 10px', width: 'auto' }} onClick={() => remove(i)}>🗑</button>
        </div>
      ))}
    </div>
  )
}

/* ─── Loja Config ─── */
function LojaConfig({ D, save }) {
  const [form, setForm] = useState({ emoji: '🎁', name: '', price: '' })

  function submit(e) {
    e.preventDefault()
    save({ ...D, shop: [...D.shop, { emoji: form.emoji || '🎁', name: form.name, price: Number(form.price) }] })
    setForm({ emoji: '🎁', name: '', price: '' })
  }

  function remove(i) {
    save({ ...D, shop: D.shop.filter((_, j) => j !== i) })
  }

  return (
    <div>
      <form className="card" style={{ marginBottom: 16 }} onSubmit={submit}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Adicionar item</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div className="input-group" style={{ width: 64 }}>
            <label>Emoji</label>
            <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Nome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
        </div>
        <div className="input-group" style={{ marginBottom: 12 }}>
          <label>Preço (🪙)</label>
          <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
        </div>
        <button className="btn btn-primary" type="submit">Adicionar</button>
      </form>

      {D.shop.map((item, i) => (
        <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{item.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{item.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{item.price} 🪙</div>
          </div>
          <button className="btn btn-danger" style={{ padding: '6px 10px', width: 'auto' }} onClick={() => remove(i)}>🗑</button>
        </div>
      ))}
    </div>
  )
}

/* ─── Rotina Config ─── */
function RotinaConfig({ D, save }) {
  const [form, setForm] = useState({ time: '', title: '', desc: '', color: 'var(--accent)' })

  function submit(e) {
    e.preventDefault()
    save({ ...D, routine: [...D.routine, { ...form }] })
    setForm({ time: '', title: '', desc: '', color: 'var(--accent)' })
  }

  function remove(i) {
    save({ ...D, routine: D.routine.filter((_, j) => j !== i) })
  }

  return (
    <div>
      <form className="card" style={{ marginBottom: 16 }} onSubmit={submit}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Adicionar bloco</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div className="input-group" style={{ width: 90 }}>
            <label>Horário</label>
            <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="06:30" required />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Título</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
        </div>
        <div className="input-group" style={{ marginBottom: 12 }}>
          <label>Descrição</label>
          <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
        <button className="btn btn-primary" type="submit">Adicionar</button>
      </form>

      {D.routine.map((r, i) => (
        <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${r.color}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{r.time}</div>
            <div style={{ fontWeight: 600 }}>{r.title}</div>
            {r.desc && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{r.desc}</div>}
          </div>
          <button className="btn btn-danger" style={{ padding: '6px 10px', width: 'auto' }} onClick={() => remove(i)}>🗑</button>
        </div>
      ))}
    </div>
  )
}

/* ─── Água Config ─── */
function AguaConfig({ D, save }) {
  const [goal, setGoal] = useState(D.water.goal)

  function submit(e) {
    e.preventDefault()
    save({ ...D, water: { ...D.water, goal: Math.max(1, Number(goal)) } })
  }

  return (
    <div className="card">
      <p style={{ fontWeight: 700, marginBottom: 12 }}>Meta diária de água</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
        Cada copo = 500ml. Meta atual: {D.water.goal} copos ({(D.water.goal * 0.5).toFixed(1)}L)
      </p>
      <form onSubmit={submit}>
        <div className="input-group" style={{ marginBottom: 12 }}>
          <label>Número de copos</label>
          <input type="number" min="1" max="20" value={goal} onChange={e => setGoal(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">Salvar meta</button>
      </form>
    </div>
  )
}
