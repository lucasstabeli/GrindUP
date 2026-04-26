import { useEffect, useRef, useState } from 'react'
import OneSignal from 'react-onesignal'
import { useGameData } from './useGameData'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

const APP_NAME = 'GrindUP'

const DEFAULT_TIMES = ['07:30', '20:00']
const DEFAULT_MESSAGES = [
  'Bora treinar! Não perde o streak. 🔥',
  'Já fez as missões de hoje? Foca! 💪',
  'Um dia de cada vez. Bora lá! 🎯',
  'Missões te esperando. Vai! 💥',
  'Hora de focar. Você consegue! 🏆',
]

// ── localStorage helpers ──
function lsKey(userId) { return `grindupNotif_${userId}` }
function lsGet(userId) {
  try { return JSON.parse(localStorage.getItem(lsKey(userId)) || 'null') } catch { return null }
}
function lsSave(userId, settings) {
  try { localStorage.setItem(lsKey(userId), JSON.stringify(settings)) } catch {}
}

export function useNotifications() {
  const { D, saveImmediate } = useGameData()
  const { profile } = useUserStore()
  const timersRef = useRef([])
  const userId = profile?.id

  const [permission, setPermission] = useState(() => {
    try { return Notification.permission } catch { return 'denied' }
  })
  const [subStatus, setSubStatus] = useState('idle')
  const [subError, setSubError] = useState('')

  // ── notifSettings: localStorage tem prioridade ──
  const lsNotif = userId ? lsGet(userId) : null
  const notifSettings = lsNotif || D?.notifSettings || {}

  // Ao montar: sincroniza localStorage → Supabase se diferente
  useEffect(() => {
    if (!D || !userId || !lsNotif) return
    if (JSON.stringify(D?.notifSettings) !== JSON.stringify(lsNotif)) {
      saveImmediate({ ...D, notifSettings: lsNotif })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, !!D])

  // ── Verifica status OneSignal ao montar ──
  useEffect(() => {
    if (!userId) return
    const check = async () => {
      try { await window.__osReady } catch {}
      // login() falha com ye.Qe se não há subscription ainda — ignora o erro
      try { await OneSignal.login(userId) } catch {}
      // Verifica subscription independentemente do login
      try {
        const optedIn = OneSignal.User?.PushSubscription?.optedIn
        if (optedIn) setSubStatus('subscribed')
      } catch {}
      try {
        const perm = Notification.permission
        if (perm === 'granted') setPermission('granted')
        else if (perm === 'denied') setPermission('denied')
      } catch {}
      // iOS: subscription pode demorar a aparecer após reload do SW — tenta de novo em 3s
      setTimeout(async () => {
        try { await OneSignal.login(userId) } catch {}
        try {
          const optedIn = OneSignal.User?.PushSubscription?.optedIn
          if (optedIn) setSubStatus('subscribed')
        } catch {}
      }, 3000)
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Subscribe via OneSignal ──
  async function subscribePush() {
    if (!userId) { setSubError('Faça login primeiro.'); setSubStatus('error'); return false }

    setSubStatus('subscribing')
    setSubError('')

    // Fire native dialog IMMEDIATELY — iOS requires no await before this
    const permPromise = (typeof Notification !== 'undefined' && Notification.permission === 'default')
      ? Notification.requestPermission()
      : Promise.resolve(typeof Notification !== 'undefined' ? Notification.permission : 'denied')

    try {
      const nativePerm = await permPromise

      if (nativePerm !== 'granted') {
        setSubError('Permissão negada. Habilite nas configurações do celular.')
        setSubStatus('error')
        return false
      }

      // Permission granted — try OneSignal registration with 5s timeout
      // If it hangs, we still mark subscribed so UI doesn't freeze
      const osTimeout = new Promise(r => setTimeout(r, 5000))
      const osRegister = (async () => {
        await window.__osReady
        const os = window.OneSignal
        if (!os) return
        try { await os.Notifications.requestPermission() } catch {}
        try { await os.login(userId) } catch {}
      })()
      await Promise.race([osRegister, osTimeout])

      setPermission('granted')
      setSubStatus('subscribed')

      return true
    } catch (err) {
      const msg = String(err?.message || err)
      if (msg.includes('install') || msg.includes('manifest')) {
        setSubError('Instale o app na tela inicial primeiro.')
      } else {
        setSubError('Erro ao ativar: ' + msg.slice(0, 80))
      }
      setSubStatus('error')
      return false
    }
  }

  async function unsubscribePush() {
    try {
      await OneSignal.User?.PushSubscription?.optOut()
      setSubStatus('idle')
    } catch {}
  }

  async function requestPermission() {
    return subscribePush() ? 'granted' : 'denied'
  }

  // ── Test push via Edge Function ──
  async function testPush() {
    if (subStatus !== 'subscribed') {
      const ok = await subscribePush()
      if (!ok) return false
    }
    try {
      const { error } = await supabase.functions.invoke('send-push', {
        body: { test: true, userId },
      })
      return !error
    } catch {
      return false
    }
  }

  // ── Local schedule (app em background) ──
  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  function sendLocalNotification(body) {
    try {
      navigator.serviceWorker?.ready
        .then(reg => reg.showNotification(APP_NAME, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-32.png',
          vibrate: [100, 50, 100],
          tag: 'grindupreminder',
        }))
        .catch(() => { try { new Notification(APP_NAME, { body }) } catch {} })
    } catch {}
  }

  function scheduleForToday() {
    clearTimers()
    if (!notifSettings.enabled || permission !== 'granted') return
    const times = notifSettings.times || DEFAULT_TIMES
    const messages = notifSettings.messages || DEFAULT_MESSAGES
    const now = Date.now()
    times.forEach(time => {
      const [h, m] = time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      const diff = target.getTime() - now
      if (diff > 0 && diff < 86_400_000) {
        const id = setTimeout(() => {
          const msg = messages[Math.floor(Math.random() * messages.length)]
          if (userId) {
            supabase.functions.invoke('send-push', { body: { userId, body: msg } })
              .catch(() => sendLocalNotification(msg))
          } else {
            sendLocalNotification(msg)
          }
        }, diff)
        timersRef.current.push(id)
      }
    })
  }

  useEffect(() => {
    scheduleForToday()
    return clearTimers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifSettings.enabled, JSON.stringify(notifSettings.times), permission])

  // ── Salva: localStorage (instantâneo) + Supabase (sync) ──
  function saveNotifSettings(newSettings) {
    if (!userId) return
    lsSave(userId, newSettings)
    if (D) saveImmediate({ ...D, notifSettings: newSettings })
  }

  function toggleEnabled(val) {
    const utcOffset = -new Date().getTimezoneOffset()
    const newSettings = { ...notifSettings, enabled: val, utcOffset }

    if (val && permission !== 'granted') {
      // Salva no localStorage ANTES do async — iOS pode recarregar a página ao registrar SW
      if (userId) lsSave(userId, { ...newSettings, enabled: true })
      subscribePush().then(ok => {
        if (ok) {
          saveNotifSettings({ ...newSettings, enabled: true })
        } else {
          // Reverte se falhou
          if (userId) lsSave(userId, { ...notifSettings, enabled: false })
        }
      })
      return
    }
    if (!val) unsubscribePush()
    saveNotifSettings(newSettings)
  }

  function setTimes(times) {
    saveNotifSettings({ ...notifSettings, times, utcOffset: -new Date().getTimezoneOffset() })
  }

  return {
    permission,
    subStatus,
    subError,
    enabled: notifSettings.enabled || false,
    times: notifSettings.times || DEFAULT_TIMES,
    requestPermission,
    subscribePush,
    toggleEnabled,
    setTimes,
    testPush,
  }
}
