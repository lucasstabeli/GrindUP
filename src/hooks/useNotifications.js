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

// Convert a base64url string to a Uint8Array (needed for VAPID)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function useNotifications() {
  const { D, save } = useGameData()
  const { profile } = useUserStore()
  const timersRef = useRef([])
  const [permission, setPermission] = useState(() => {
    try { return Notification.permission } catch { return 'denied' }
  })

  // ── REQUEST PERMISSION + WEB PUSH SUBSCRIPTION ──
  async function requestPermission() {
    try {
      const res = await Notification.requestPermission()
      setPermission(res)
      if (res === 'granted') await subscribePush()
      return res
    } catch {
      return 'denied'
    }
  }

  // Subscribe to Web Push and store in Supabase
  async function subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUBLIC_KEY || !profile?.id) return
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      // Store subscription in Supabase
      const subJson = sub.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: profile.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch (err) {
      console.warn('Push subscribe failed:', err)
    }
  }

  // Unsubscribe from push
  async function unsubscribePush() {
    if (!('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      if (profile?.id) {
        await supabase.from('push_subscriptions').delete().eq('user_id', profile.id)
      }
    } catch {}
  }

  // ── LOCAL SCHEDULE (backup: works when tab is open) ──
  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  function sendNotification(body) {
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
    const enabled = D?.notifSettings?.enabled
    if (!enabled || permission !== 'granted') return

    const times = D?.notifSettings?.times || DEFAULT_TIMES
    const messages = D?.notifSettings?.messages || DEFAULT_MESSAGES
    const now = Date.now()

    times.forEach(time => {
      const [h, m] = time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      const diff = target.getTime() - now
      if (diff > 0 && diff < 86_400_000) {
        const id = setTimeout(() => {
          const body = messages[Math.floor(Math.random() * messages.length)]
          sendNotification(body)
        }, diff)
        timersRef.current.push(id)
      }
    })
  }

  useEffect(() => {
    scheduleForToday()
    return clearTimers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D?.notifSettings?.enabled, JSON.stringify(D?.notifSettings?.times), permission])

  // Subscribe when permission is granted and profile is ready
  useEffect(() => {
    if (permission === 'granted' && profile?.id && D?.notifSettings?.enabled) {
      subscribePush()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, profile?.id, D?.notifSettings?.enabled])

  function toggleEnabled(val) {
    if (!D) return
    if (val && permission !== 'granted') {
      requestPermission().then(res => {
        if (res === 'granted') {
          save({ ...D, notifSettings: { ...(D.notifSettings || {}), enabled: true } })
        }
      })
      return
    }
    if (!val) unsubscribePush()
    save({ ...D, notifSettings: { ...(D.notifSettings || {}), enabled: val } })
  }

  function setTimes(times) {
    if (!D) return
    save({ ...D, notifSettings: { ...(D.notifSettings || {}), times } })
  }

  function testNow() {
    const messages = D?.notifSettings?.messages || DEFAULT_MESSAGES
    const body = messages[Math.floor(Math.random() * messages.length)]
    sendNotification(body)
  }

  return {
    permission,
    enabled: D?.notifSettings?.enabled || false,
    times: D?.notifSettings?.times || DEFAULT_TIMES,
    requestPermission,
    toggleEnabled,
    setTimes,
    testNow,
  }
}
