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

  // ── Verifica status OneSignal ao montar e escuta mudanças ──
  useEffect(() => {
    if (!userId) return
    let cleanup = () => {}
    const check = async () => {
      try { await window.__osReady } catch {}

      // Se já existe subscription com APNS válido (id presente), faz login (re-aliasa).
      try {
        const sub = OneSignal.User?.PushSubscription
        // optedIn sem id/token = estado fantasma. Não marca como subscribed.
        if (sub?.optedIn && sub?.id && sub?.token) {
          try { await OneSignal.login(userId) } catch {}
          setSubStatus('subscribed')
        }

        // Listener pra refletir qualquer mudança futura (subscribe/unsubscribe via outro device, etc)
        const handler = (event) => {
          const opted = event?.current?.optedIn ?? sub?.optedIn
          if (opted) {
            setSubStatus('subscribed')
            // Re-aliasa quando a subscription nascer
            OneSignal.login(userId).catch(() => {})
          } else {
            setSubStatus(prev => prev === 'subscribed' ? 'idle' : prev)
          }
        }
        sub?.addEventListener?.('change', handler)
        cleanup = () => { try { sub?.removeEventListener?.('change', handler) } catch {} }
      } catch {}

      try {
        const perm = Notification.permission
        if (perm === 'granted') setPermission('granted')
        else if (perm === 'denied') setPermission('denied')
      } catch {}
    }
    check()
    return () => cleanup()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Subscribe via OneSignal ──
  // forceFresh=true: invalida subscription antiga e cria uma nova (caso o token APNS esteja morto)
  async function subscribePush(forceFresh = false) {
    if (!userId) { setSubError('Faça login primeiro.'); setSubStatus('error'); return false }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

    setSubStatus('subscribing')
    setSubError('')

    try {
      // Garante que a OneSignal terminou de inicializar
      await Promise.race([
        window.__osReady,
        new Promise(r => setTimeout(r, 8000)),
      ]).catch(() => {})

      const sub = OneSignal.User?.PushSubscription

      // Login primeiro — alias correto na hora de criar subscription
      try { await OneSignal.login(userId) } catch (e) { console.warn('login falhou', e) }

      // Se forçar refresh, opt-out primeiro pra invalidar token APNS antigo
      if (forceFresh && sub?.optedIn) {
        try { await sub.optOut() } catch {}
        await new Promise(r => setTimeout(r, 500))
      }

      // Se já está inscrito (e não forçou refresh), só confirma
      if (!forceFresh && sub?.optedIn) {
        const id = sub.id
        const token = sub.token
        console.log('[push] já inscrito, subscription_id:', id, 'token:', token ? 'presente' : 'NULL')
        if (!id || !token) {
          // optedIn=true mas sem ID/token = estado fantasma (config OneSignal incompleta).
          // Força refresh; se ainda assim vier null, é problema de config no dashboard.
          return subscribePush(true)
        }
        setPermission('granted')
        setSubStatus('subscribed')
        return true
      }

      // Listener pro evento de subscription nascer
      const subscribed = new Promise((resolve) => {
        let done = false
        const finish = (val) => {
          if (done) return
          done = true
          try { sub?.removeEventListener?.('change', handler) } catch {}
          resolve(val)
        }
        const handler = (event) => {
          const opted = event?.current?.optedIn ?? sub?.optedIn
          const id = event?.current?.id ?? sub?.id
          const token = event?.current?.token ?? sub?.token
          // Só consideramos "inscrito de verdade" se TIVER token — sem token a Apple não recebe nada.
          if (opted && id && token) finish(true)
        }
        try { sub?.addEventListener?.('change', handler) } catch {}
        setTimeout(() => {
          const opted = sub?.optedIn === true
          const id = sub?.id
          const token = sub?.token
          finish(opted && !!id && !!token)
        }, 30000)
      })

      // Pede permissão via OneSignal (síncrono com o gesto do usuário)
      let permRes
      try {
        permRes = await OneSignal.Notifications.requestPermission()
      } catch (e) {
        console.warn('requestPermission erro', e)
        permRes = Notification.permission === 'granted'
      }

      const granted = permRes === true || permRes === 'granted' || Notification.permission === 'granted'

      if (!granted) {
        setSubError(isIOS
          ? 'Permissão negada. Vá em Ajustes > GrindUP > Notificações e ative.'
          : 'Permissão negada. Habilite nas configurações do navegador.')
        setSubStatus('error')
        return false
      }

      setPermission('granted')

      // Opt-in explícito (idempotente)
      if (!sub?.optedIn) {
        try { sub?.optIn?.() } catch (e) { console.warn('optIn erro', e) }
      }

      const ok = await subscribed

      if (!ok) {
        const hasId = !!sub?.id
        const hasToken = !!sub?.token
        let detail = ''
        if (hasId && !hasToken) {
          detail = ' — Token vazio: a config Web do OneSignal está incompleta. Vá no dashboard > Settings > Push & In-App > Web e confirme o Site URL.'
        } else if (!hasId) {
          detail = ' — Subscription nem foi criada. Verifique conexão e config do OneSignal.'
        }
        setSubError(`Falha no registro${detail}`)
        setSubStatus('error')
        return false
      }

      // Re-confirma login depois que a subscription existe
      try { await OneSignal.login(userId) } catch {}

      console.log('[push] inscrito com sucesso. subscription_id:', sub?.id)
      setSubStatus('subscribed')
      return true
    } catch (err) {
      const msg = String(err?.message || err)
      setSubError('Erro ao ativar: ' + msg.slice(0, 100))
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
    // Confirma que temos subscription_id de verdade antes de mandar
    const subId = OneSignal.User?.PushSubscription?.id
    if (!subId) {
      return 'Sem subscription_id local. Force "Atualizar app" e ative novamente.'
    }
    try {
      const { data: result, error } = await supabase.functions.invoke('send-push', {
        body: { test: true, userId },
      })
      if (error) return `Erro ao chamar servidor: ${String(error?.message || error).slice(0, 60)}`
      if (result?.noRecipients) return 'noRecipients'
      if (result?.osError) return `Erro OneSignal ${result.osStatus || ''}: verifique a API key no dashboard`
      if (!result?.ok) return result?.error || 'Falhou'
      // recipients > 0 mas com errors = token APNS inválido (cenário comum após reinstalar)
      if (result?.errors) {
        console.warn('[push] enviado mas com erros:', result.errors)
        return `Token APNS rejeitado pela Apple: ${JSON.stringify(result.errors).slice(0, 120)}`
      }
      console.log('[push] enviado, notificationId:', result?.notificationId, 'recipients:', result?.recipients)
      return true
    } catch (e) {
      return `Erro: ${String(e).slice(0, 60)}`
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

    if (val && (permission !== 'granted' || subStatus !== 'subscribed')) {
      // Salva no localStorage ANTES do async — iOS pode recarregar a página ao registrar SW
      if (userId) lsSave(userId, { ...newSettings, enabled: true })
      // forceFresh=true: garante token APNS novo, não confia em estado cached
      subscribePush(true).then(ok => {
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

  // ── Teste de notificação LOCAL (sem servidor) ──
  // Se isso funcionar mas o testPush não, problema é OneSignal/Apple, não código.
  async function testLocalNotification() {
    try {
      if (Notification.permission !== 'granted') {
        return 'Permissão não concedida no nível do iOS. Vá em Ajustes > GrindUP > Notificações.'
      }
      const reg = await navigator.serviceWorker?.ready
      if (!reg) return 'Service Worker não registrado.'
      await reg.showNotification(APP_NAME, {
        body: 'Teste local — se você está vendo isso, o iOS está OK.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-32.png',
        tag: 'grindup-local-test',
      })
      return true
    } catch (e) {
      return `Erro local: ${String(e?.message || e).slice(0, 80)}`
    }
  }

  // ── Teste com DELAY: dispara depois de N segundos pra você fechar o app antes ──
  // iOS não mostra banner quando o PWA está em foreground — precisa estar fechado.
  function testLocalDelayed(seconds = 10) {
    const fireAt = Date.now() + seconds * 1000
    setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker?.ready
        if (!reg) return
        await reg.showNotification(APP_NAME, {
          body: 'Notificação local com delay funcionou! 🎉',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-32.png',
          tag: 'grindup-delayed-test',
          requireInteraction: true,
        })
      } catch {}
    }, seconds * 1000)
    return fireAt
  }

  function testRemoteDelayed(seconds = 10) {
    const fireAt = Date.now() + seconds * 1000
    setTimeout(() => {
      supabase.functions.invoke('send-push', {
        body: { test: true, userId, body: 'Notificação remota com delay funcionou! 🎉' },
      }).catch(() => {})
    }, seconds * 1000)
    return fireAt
  }

  // ── Diagnóstico: dados pra debug ──
  function getDiagnostics() {
    const sub = OneSignal.User?.PushSubscription
    const ua = navigator.userAgent
    const iosMatch = ua.match(/OS (\d+)_(\d+)/)
    const iosVersion = iosMatch ? `${iosMatch[1]}.${iosMatch[2]}` : null
    return {
      subscriptionId: sub?.id || null,
      subscriptionToken: sub?.token ? sub.token.slice(0, 20) + '...' : null,
      optedIn: sub?.optedIn ?? null,
      onesignalId: OneSignal.User?.onesignalId || null,
      externalId: OneSignal.User?.externalId || null,
      browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
      isStandalone: window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true,
      isIOS: /iphone|ipad|ipod/i.test(ua),
      iosVersion,
      hasServiceWorker: 'serviceWorker' in navigator,
      userId,
    }
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
    testLocalNotification,
    testLocalDelayed,
    testRemoteDelayed,
    getDiagnostics,
  }
}
