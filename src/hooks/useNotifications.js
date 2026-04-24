import { useEffect, useRef, useState } from 'react'
import { useGameData } from './useGameData'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

const APP_NAME = 'GrindUP'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

const DEFAULT_TIMES = ['07:30', '20:00']
const DEFAULT_MESSAGES = [
  'Bora treinar! Não perde o streak. 🔥',
  'Já fez as missões de hoje? Foca! 💪',
  'Um dia de cada vez. Bora lá! 🎯',
  'Missões te esperando. Vai! 💥',
  'Hora de focar. Você consegue! 🏆',
]

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

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

  const [permission, setPermission] = useState(() => {
    try { return Notification.permission } catch { return 'denied' }
  })
  const [subStatus, setSubStatus] = useState('idle')
  const [subError, setSubError] = useState('')

  // ── Lê notifSettings: localStorage tem prioridade sobre Supabase ──
  const userId = profile?.id
  const lsNotif = userId ? lsGet(userId) : null
  const dbNotif = D?.notifSettings || {}
  const notifSettings = lsNotif || dbNotif

  // Ao montar: se localStorage tem dados diferentes do banco, sincroniza pro banco
  useEffect(() => {
    if (!D || !userId || !lsNotif) return
    const dbStr = JSON.stringify(dbNotif)
    const lsStr = JSON.stringify(lsNotif)
    if (dbStr !== lsStr) {
      saveImmediate({ ...D, notifSettings: lsNotif })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, !!D])

  // ── Subscribe to Web Push ──
  async function subscribePush() {
    if (!('serviceWorker' in navigator)) {
      setSubError('Service Worker não suportado neste browser.')
      setSubStatus('error')
      return false
    }
    if (!('PushManager' in window)) {
      setSubError('Push não suportado. No iPhone: instale o app e use o Safari.')
      setSubStatus('error')
      return false
    }
    if (!VAPID_PUBLIC_KEY) {
      setSubError('Chave VAPID não configurada.')
      setSubStatus('error')
      return false
    }
    if (!userId) {
      setSubError('Faça login primeiro.')
      setSubStatus('error')
      return false
    }

    setSubStatus('subscribing')
    setSubError('')

    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const subJson = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if (error) throw error

      setSubStatus('subscribed')
      return true
    } catch (err) {
      console.error('subscribePush error:', err)
      const msg = err?.message || String(err)
      if (msg.includes('permission') || msg.includes('denied')) {
        setSubError('Permissão negada. Habilite nas configurações do celular.')
      } else if (msg.includes('install') || msg.includes('manifest')) {
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
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      if (userId) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId)
      }
      setSubStatus('idle')
    } catch {}
  }

  // ── Request permission ──
  async function requestPermission() {
    try {
      const res = await Notification.requestPermission()
      setPermission(res)
      if (res === 'granted') {
        await subscribePush()
      } else {
        setSubError('Permissão negada. Vá em Configurações do celular e habilite notificações para este site.')
        setSubStatus('error')
      }
      return res
    } catch {
      return 'denied'
    }
  }

  // Check if already subscribed on mount
  useEffect(() => {
    if (!userId || permission !== 'granted') return
    supabase.from('push_subscriptions').select('user_id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) setSubStatus('subscribed')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, permission])

  // ── Send real push via Edge Function ──
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
      sendLocalNotification('Teste de notificação! 🔥')
      return true
    }
  }

  // ── Local schedule ──
  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  function sendLocalNotification(body) {
    const opts = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-32.png',
      vibrate: [100, 50, 100],
      tag: 'grindupreminder',
    }
    navigator.serviceWorker?.ready
      .then(reg => reg.showNotification(APP_NAME, opts))
      .catch(() => { try { new Notification(APP_NAME, opts) } catch {} })
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

  // ── Salva notifSettings: localStorage (instantâneo) + Supabase (async) ──
  function saveNotifSettings(newSettings) {
    if (!userId) return
    lsSave(userId, newSettings)  // sempre salva no localStorage primeiro
    if (D) saveImmediate({ ...D, notifSettings: newSettings })
  }

  function toggleEnabled(val) {
    const utcOffset = -new Date().getTimezoneOffset()
    const newSettings = { ...notifSettings, enabled: val, utcOffset }

    if (val && permission !== 'granted') {
      requestPermission().then(res => {
        if (res === 'granted') {
          saveNotifSettings({ ...newSettings, enabled: true })
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
