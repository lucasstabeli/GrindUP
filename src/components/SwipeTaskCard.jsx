import { useRef, useEffect, useCallback, useState } from 'react'
import { fmt } from '../hooks/useGameData'

const BASE_OPACITY = 0

export default function SwipeTaskCard({ task, index, onComplete, onFail, onUndo }) {
  const cardRef = useRef(null)
  const stateRef = useRef({ startX: 0, startY: 0, curX: 0, dragging: false, dirLocked: false, isHoriz: false })
  const onCompleteRef = useRef(onComplete)
  const onFailRef = useRef(onFail)
  const [trophyPop, setTrophyPop] = useState(0)
  const THRESHOLD = 80
  const trophyVal = task.trophy ?? 1

  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { onFailRef.current = onFail }, [onFail])

  const onStart = useCallback((x, y) => {
    stateRef.current = { startX: x, startY: y, curX: x, dragging: true, dirLocked: false, isHoriz: false }
    if (cardRef.current) cardRef.current.style.transition = 'none'
  }, [])

  const onMove = useCallback((x, y) => {
    const s = stateRef.current
    if (!s.dragging) return
    const dx = x - s.startX
    const dy = y - s.startY
    if (!s.dirLocked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      s.dirLocked = true
      s.isHoriz = Math.abs(dx) > Math.abs(dy)
      if (s.isHoriz && cardRef.current) cardRef.current.classList.add('swiping-h')
    }
    if (!s.isHoriz) return
    s.curX = x
    const card = cardRef.current
    if (!card) return
    card.style.transform = `translateX(${dx}px) rotate(${dx * 0.025}deg)`
    card.style.opacity = String(1 - Math.abs(dx) / 320)
    const prog = Math.min(Math.abs(dx) / THRESHOLD, 1)
    const hintR = card.querySelector('.sh-done')
    const hintL = card.querySelector('.sh-fail')
    if (dx > 0) {
      // swiping right = complete (reward)
      card.style.background = `color-mix(in srgb, var(--surface) ${100 - prog * 28}%, var(--success) ${prog * 28}%)`
      if (hintR) hintR.style.opacity = String(Math.max(BASE_OPACITY, prog))
      if (hintL) hintL.style.opacity = String(BASE_OPACITY * (1 - prog * 0.8))
    } else if (dx < 0) {
      // swiping left = fail (penalty)
      card.style.background = `color-mix(in srgb, var(--surface) ${100 - prog * 28}%, var(--danger) ${prog * 28}%)`
      if (hintL) hintL.style.opacity = String(Math.max(BASE_OPACITY, prog))
      if (hintR) hintR.style.opacity = String(BASE_OPACITY * (1 - prog * 0.8))
    } else {
      card.style.background = ''
      if (hintR) hintR.style.opacity = String(BASE_OPACITY)
      if (hintL) hintL.style.opacity = String(BASE_OPACITY)
    }
  }, [])

  const onEnd = useCallback(() => {
    const s = stateRef.current
    if (!s.dragging) return
    s.dragging = false
    const card = cardRef.current
    if (!card) return
    card.classList.remove('swiping-h')
    if (!s.isHoriz) return
    const dx = s.curX - s.startX
    card.style.transition = 'transform .28s ease, opacity .28s ease'
    if (dx > THRESHOLD) {
      // show trophy pop briefly, then animate card off
      setTrophyPop(trophyVal)
      card.style.transform = ''
      card.style.opacity = ''
      card.style.background = ''
      const hintR = card.querySelector('.sh-done')
      const hintL = card.querySelector('.sh-fail')
      if (hintR) hintR.style.opacity = String(BASE_OPACITY)
      if (hintL) hintL.style.opacity = String(BASE_OPACITY)
      setTimeout(() => onCompleteRef.current(index), 850)
    } else if (dx < -THRESHOLD) {
      card.style.transform = 'translateX(-130%) rotate(-15deg)'
      card.style.opacity = '0'
      setTimeout(() => onFailRef.current(index), 280)
    } else {
      card.style.transform = ''
      card.style.opacity = ''
      card.style.background = ''
      const hintR = card.querySelector('.sh-done')
      const hintL = card.querySelector('.sh-fail')
      if (hintR) hintR.style.opacity = String(BASE_OPACITY)
      if (hintL) hintL.style.opacity = String(BASE_OPACITY)
    }
  }, [index])

  useEffect(() => {
    const mm = (e) => { if (stateRef.current.dragging) onMove(e.clientX, e.clientY) }
    const mu = () => { if (stateRef.current.dragging) onEnd() }
    document.addEventListener('mousemove', mm)
    document.addEventListener('mouseup', mu)
    return () => {
      document.removeEventListener('mousemove', mm)
      document.removeEventListener('mouseup', mu)
    }
  }, [onMove, onEnd])

  const handleTouchStart = (e) => onStart(e.touches[0].clientX, e.touches[0].clientY)
  const handleTouchMove = (e) => {
    const s = stateRef.current
    const dx = e.touches[0].clientX - s.startX
    const dy = e.touches[0].clientY - s.startY
    if (s.dirLocked && s.isHoriz) e.preventDefault()
    else if (!s.dirLocked && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) e.preventDefault()
    onMove(e.touches[0].clientX, e.touches[0].clientY)
  }

  const pen = task.penalty || 0

  // Completed/failed state
  if (task.state !== 'idle') {
    const isDone = task.state === 'done'
    return (
      <div className={`task-card ${task.state}`}>
        <div className="task-top">
          <div className="emoji-box">{task.emoji}</div>
          <div className="task-main">
            <h3>{task.title}</h3>
            <p>{task.desc}</p>
          </div>
          <div className="task-status">
            {isDone
              ? <span className="tag done">✓ Feito</span>
              : <span className="tag failed">✗ Não</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <span className="task-coin-note" style={{ color: isDone ? 'var(--success)' : 'var(--danger)', fontSize: '0.78rem', fontWeight: 700 }}>
            {isDone ? `+${fmt(task.reward)} 🪙` : pen > 0 ? `-${pen} 🪙` : ''}
          </span>
          <button className="btn" onClick={() => onUndo(index)} style={{ fontSize: 11, padding: '5px 12px', width: 'auto' }}>↩ Desfazer</button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className="task-card swipe-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={onEnd}
      onMouseDown={(e) => { e.preventDefault(); onStart(e.clientX, e.clientY) }}
    >
      {trophyPop > 0 && <div className="trophy-pop">+{trophyPop} 🏆</div>}
      {/* Swipe feedback overlays — hidden at rest, revealed by JS during drag */}
      {pen > 0 && (
        <div className="sh-fail" style={{ opacity: 0 }}>
          <span className="sh-icon">✕</span>
          <span className="sh-coins">-{pen}🪙</span>
        </div>
      )}
      <div className="sh-done" style={{ opacity: 0 }}>
        <span className="sh-icon">✓</span>
        <span className="sh-coins">+{task.reward}🪙</span>
      </div>

      <div className="task-top">
        <div className="emoji-box">{task.emoji}</div>
        <div className="task-main">
          <h3>{task.title}</h3>
          <p>{task.desc}</p>
        </div>
        <div className="task-status">
          <span className="tag">Pendente</span>
          <span className="task-reward">+{task.reward}🪙</span>
        </div>
      </div>
      <div className="swipe-hint-row">
        <span className="hint-fail">← falhar{pen > 0 ? ` -${pen}🪙` : ''}</span>
        <span style={{ opacity: 0.4, fontSize: 10 }}>deslize</span>
        <span className="hint-done">+{task.reward}🪙 concluir →</span>
      </div>
    </div>
  )
}
