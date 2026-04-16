import { useState } from 'react'
import { useGameData, WORKOUTS, getWeekWorkout } from '../hooks/useGameData'

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DAY_LETTERS = ['S','T','Q','Q','S','S','D']
const MISS_PENALTY = 20

function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Monday=0 ... Sunday=6
function weekIdx(date) {
  const dow = date.getDay()
  return dow === 0 ? 6 : dow - 1
}

export default function Calendario() {
  const { D, save } = useGameData()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = dateKey(today)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)
  const [editActual, setEditActual] = useState('')

  if (!D) return null

  const calLog = D.calendarLog || {}
  const weeklyWorkouts = D.weeklyWorkouts || WORKOUTS

  function setWeeklyWorkout(i, val) {
    const ww = [...weeklyWorkouts]
    ww[i] = val
    save({ ...D, weeklyWorkouts: ww })
  }

  function getScheduled(date) {
    return getWeekWorkout(D, weekIdx(date))
  }

  function markDay(date, status, actualOverride) {
    const key = dateKey(date)
    const prev = calLog[key]
    let coins = D.coins

    if (!D.vacation) {
      // Desfaz penalidade anterior se era 'missed'
      if (prev?.status === 'missed') coins += MISS_PENALTY
      // Aplica nova penalidade
      if (status === 'missed') coins = Math.max(0, coins - MISS_PENALTY)
    }

    const newLog = { ...calLog }
    if (!status) {
      delete newLog[key]
    } else {
      newLog[key] = {
        status,
        actual: actualOverride !== undefined
          ? actualOverride
          : (prev?.actual || getScheduled(date)),
      }
    }
    save({ ...D, calendarLog: newLog, coins })
    setEditActual('')
  }

  // Retorna lista de treinos perdidos que "carregaram" até esta data
  function getCarryDebts(date) {
    const debts = []
    const d = new Date(date)
    for (let i = 0; i < 14; i++) {
      d.setDate(d.getDate() - 1)
      const key = dateKey(d)
      const entry = calLog[key]
      if (!entry) break
      if (entry.status === 'missed') {
        debts.unshift(entry.actual || getScheduled(new Date(d)))
      } else {
        break // 'done' ou 'rest' quebra a cadeia
      }
    }
    return debts
  }

  // Monta grid do calendário mensal (início segunda-feira)
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const lastOfMonth = new Date(viewYear, viewMonth + 1, 0)
  const startOffset = weekIdx(firstOfMonth)

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    cells.push(new Date(viewYear, viewMonth, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const selKey = selected ? dateKey(selected) : null
  const selEntry = selKey ? calLog[selKey] : null
  const selScheduled = selected ? getScheduled(selected) : ''
  const selDebts = selected ? getCarryDebts(selected) : []
  const selIsToday = selKey === todayStr
  const selIsFuture = selected && selected > today

  return (
    <div className="app-section">

      {/* ── EDITOR SEMANAL ── */}
      <div className="section-head">
        <h2>Semana de treinos</h2>
        <span>configure cada dia</span>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {DAY_LETTERS.map((letter, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800,
                color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {letter}
              </span>
              <input
                value={weeklyWorkouts[i] || ''}
                onChange={e => setWeeklyWorkout(i, e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '6px 2px',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
        <p style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--muted)' }}>
          Edite o treino de cada dia — o calendário se atualiza automaticamente.
        </p>
      </div>

      {/* ── CALENDÁRIO MENSAL ── */}
      <div className="section-head">
        <h2>Calendário</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={prevMonth}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
          >◀</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
          >▶</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        {/* Cabeçalho dias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
          {DAY_LETTERS.map((l, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: '0.62rem', fontWeight: 800,
              color: 'var(--muted)', textTransform: 'uppercase', padding: '4px 0',
            }}>
              {l}
            </div>
          ))}
        </div>

        {/* Células */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />
            const key = dateKey(date)
            const entry = calLog[key]
            const status = entry?.status || ''
            const isT = key === todayStr
            const isSel = key === selKey
            const debts = getCarryDebts(date)
            const hasDebt = debts.length > 0 && status !== 'done'
            const sched = getScheduled(date)

            let bg = 'var(--surface-2)'
            let textColor = 'var(--muted)'
            if (status === 'done')   { bg = 'rgba(37,196,90,.18)';  textColor = 'var(--success)' }
            if (status === 'missed') { bg = 'rgba(232,53,53,.15)';  textColor = 'var(--danger)' }
            if (status === 'rest')   { bg = 'rgba(167,139,250,.15)'; textColor = 'var(--purple)' }

            const borderColor = isSel
              ? 'var(--text)'
              : isT
              ? 'var(--accent)'
              : 'transparent'

            return (
              <div
                key={key}
                onClick={() => { setSelected(isSel ? null : date); setEditActual('') }}
                style={{
                  background: bg,
                  border: `2px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  position: 'relative',
                  minHeight: 54,
                  transition: 'border-color 0.12s',
                }}
              >
                <span style={{
                  fontSize: '0.75rem', fontWeight: 800,
                  color: isT ? 'var(--accent)' : textColor,
                }}>
                  {date.getDate()}
                </span>
                <span style={{
                  fontSize: '0.48rem', fontWeight: 700,
                  color: textColor, textAlign: 'center', lineHeight: 1.2,
                }}>
                  {(entry?.actual || sched).substring(0, 5)}
                </span>
                <span style={{ fontSize: '0.6rem', lineHeight: 1 }}>
                  {status === 'done' && '✓'}
                  {status === 'missed' && '✗'}
                  {status === 'rest' && '💤'}
                </span>
                {hasDebt && (
                  <span style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="chip" style={{ background: 'rgba(37,196,90,.15)', color: 'var(--success)', fontSize: '0.68rem' }}>✓ Fui</span>
          <span className="chip" style={{ background: 'rgba(232,53,53,.15)', color: 'var(--danger)', fontSize: '0.68rem' }}>✗ Perdi</span>
          <span className="chip" style={{ background: 'rgba(167,139,250,.15)', color: 'var(--purple)', fontSize: '0.68rem' }}>💤 Desc.</span>
          <span className="chip" style={{ background: 'rgba(232,160,32,.15)', color: 'var(--accent)', fontSize: '0.68rem' }}>● Pendente</span>
        </div>
      </div>

      {/* ── PAINEL DO DIA SELECIONADO ── */}
      {selected && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ color: selIsToday ? 'var(--accent)' : 'var(--text)' }}>
              {selected.getDate()} de {MONTH_NAMES[selected.getMonth()]}
              {selIsToday ? ' · Hoje' : ''}
            </h3>
            {selEntry && (
              <button
                onClick={() => { markDay(selected, null); setSelected(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Limpar
              </button>
            )}
          </div>

          {/* Treinos pendentes carry-over */}
          {selDebts.length > 0 && (
            <div style={{
              background: 'rgba(232,160,32,.1)',
              border: '1px solid rgba(232,160,32,.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: '0.82rem',
              color: 'var(--accent)',
            }}>
              ⚠️ Treino(s) pendente(s): <strong>{selDebts.join(', ')}</strong>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 14 }}>
            Treino programado:{' '}
            <strong style={{ color: 'var(--text)' }}>
              {selEntry?.actual || selScheduled}
            </strong>
          </p>

          {/* Botões de status — só para hoje e dias passados */}
          {!selIsFuture && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { status: 'done',   label: '✓ Fui',   bg: 'rgba(37,196,90,.18)',   active: 'rgba(37,196,90,.35)',   border: 'var(--success)', color: 'var(--success)' },
                  { status: 'missed', label: '✗ Perdi', bg: 'rgba(232,53,53,.12)',    active: 'rgba(232,53,53,.3)',    border: 'var(--danger)',  color: 'var(--danger)' },
                  { status: 'rest',   label: '💤 Desc.', bg: 'rgba(167,139,250,.12)', active: 'rgba(167,139,250,.3)', border: 'var(--purple)',  color: 'var(--purple)' },
                ].map(opt => {
                  const isActive = selEntry?.status === opt.status
                  return (
                    <button
                      key={opt.status}
                      className="btn"
                      onClick={() => markDay(selected, isActive ? null : opt.status)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '10px 4px',
                        background: isActive ? opt.active : opt.bg,
                        color: opt.color,
                        border: `1.5px solid ${isActive ? opt.border : 'transparent'}`,
                        textTransform: 'none',
                        letterSpacing: 0,
                        fontWeight: 700,
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Edição do que foi feito */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  O que fiz (editar):
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={editActual}
                    onChange={e => setEditActual(e.target.value)}
                    onFocus={() => { if (!editActual) setEditActual(selEntry?.actual || selScheduled) }}
                    placeholder={selEntry?.actual || selScheduled || 'Ex: Basquete, Natação…'}
                    style={{
                      flex: 1,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: '0.88rem',
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <button
                    className="btn"
                    disabled={!editActual.trim()}
                    onClick={() => {
                      markDay(selected, selEntry?.status || 'done', editActual.trim())
                    }}
                    style={{
                      background: editActual.trim() ? 'var(--accent-soft)' : 'var(--surface-2)',
                      color: editActual.trim() ? 'var(--accent)' : 'var(--muted)',
                      border: `1px solid ${editActual.trim() ? 'var(--accent)' : 'var(--line)'}`,
                      padding: '10px 14px',
                      fontSize: '0.82rem',
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}
                  >
                    Salvar
                  </button>
                </div>
                <p style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--muted)' }}>
                  Deixe em branco para usar o treino programado.
                </p>
              </div>
            </>
          )}

          {selIsFuture && (
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>
              Ainda não chegou esse dia.
            </div>
          )}

          {D.vacation && (
            <div style={{
              marginTop: 12, fontSize: '0.78rem', color: 'var(--purple)',
              background: 'rgba(167,139,250,.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            }}>
              🏖️ Modo férias ativo — sem penalidades
            </div>
          )}

          {!D.vacation && !selIsFuture && selEntry?.status !== 'done' && selEntry?.status !== 'rest' && (
            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--danger)', opacity: 0.8 }}>
              ⚠️ Marcar como perdido desconta {MISS_PENALTY} moedas.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
