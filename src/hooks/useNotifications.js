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

// ── Logger persistente: guarda últimos 80 eventos no localStorage pra debug ──
const LOG_KEY = 'grindupPushLog'
function pushLog(msg, data) {
  try {
    const t = new Date().toISOString().slice(11, 19)
    const entry = { t, msg, data: data === undefined ? null : (typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200)) }
    const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
    existing.push(entry)
    if (existing.length > 80) existing.splice(0, existing.length - 80)
    localStorage.setItem(LOG_KEY, JSON.stringify(existing))
    console.log('[push]', t, msg, data ?? '')
  } catch {}
}
function getLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') } catch { return [] }
}
function clearLog() { try { localStorage.removeItem(LOG_KEY) } catch {} }

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
    let cancelled = false

    const check = async () => {
      try { await window.__osReady } catch {}
      if (cancelled) return

      try {
        const sub = OneSignal.User?.PushSubscription

        // Polling: depois de reabrir o PWA, OneSignal pode demorar 1-3s pra
        // restaurar id/token do cache. Tentamos por até 8s antes de desistir.
        let attempts = 0
        while (attempts < 16 && !cancelled) {
          if (sub?.optedIn && sub?.id && sub?.token) {
            try { await OneSignal.login(userId) } catch {}
            if (!cancelled) setSubStatus('subscribed')
            break
          }
          await new Promise(r => setTimeout(r, 500))
          attempts++
        }

        // Listener pra mudanças futuras
        const handler = (event) => {
          const opted = event?.current?.optedIn ?? sub?.optedIn
          const id = event?.current?.id ?? sub?.id
          const token = event?.current?.token ?? sub?.token
          if (opted && id && token) {
            setSubStatus('subscribed')
            OneSignal.login(userId).catch(() => {})
          } else if (!opted) {
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
    return () => { cancelled = true; cleanup() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Subscribe via OneSignal ──
  // forceFresh=true: invalida subscription antiga e cria uma nova (caso o token APNS esteja morto)
  async function subscribePush(forceFresh = false) {
    if (!userId) { setSubError('Faça login primeiro.'); setSubStatus('error'); return false }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

    pushLog('subscribePush START', { forceFresh, isIOS, userId: userId.slice(0,8) })

    setSubStatus('subscribing')
    setSubError('')

    // Helper: timeout pra qualquer Promise (evita travar pra sempre)
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)),
      ])

    // Failsafe geral: se a função toda passar de 50s, aborta
    const overallTimeout = setTimeout(() => {
      setSubError('Timeout: registro demorou demais. Tente de novo.')
      setSubStatus('error')
    }, 50000)

    try {
      // Garante que a OneSignal terminou de inicializar
      pushLog('aguardando __osReady')
      await Promise.race([
        window.__osReady,
        new Promise(r => setTimeout(r, 8000)),
      ]).catch(() => {})

      const sub = OneSignal.User?.PushSubscription
      pushLog('estado inicial OneSignal', {
        hasSub: !!sub,
        optedIn: sub?.optedIn,
        id: sub?.id,
        token: sub?.token ? 'PRESENTE' : 'NULL',
      })

      // DETECTA ESTADO ZUMBI: tem id mas sem token = subscription quebrada.
      // Auto-promove pra forceFresh pra limpar antes de tentar de novo.
      const isZombie = !!sub?.id && !sub?.token
      if (isZombie && !forceFresh) {
        pushLog('ESTADO ZUMBI detectado (id sem token), forçando refresh')
        forceFresh = true
      }

      // Login primeiro — alias correto na hora de criar subscription
      pushLog('chamando login')
      try { await withTimeout(OneSignal.login(userId), 8000, 'login') ; pushLog('login OK') } catch (e) { pushLog('login falhou', e?.message) }

      // Se forçar refresh, limpa subscription antiga em DOIS níveis
      if (forceFresh) {
        pushLog('forceFresh: limpando estado anterior')
        if (sub?.optedIn) {
          try { await sub.optOut(); pushLog('OneSignal optOut OK') } catch (e) { pushLog('OneSignal optOut falhou', e?.message) }
        }
        try {
          const reg = await navigator.serviceWorker?.ready
          pushLog('SW ready', { scope: reg?.scope, scriptURL: reg?.active?.scriptURL })
          const browserSub = await reg?.pushManager?.getSubscription()
          pushLog('browser subscription antes do unsubscribe', browserSub ? { endpoint: browserSub.endpoint?.slice(0, 50) } : 'NENHUMA')
          if (browserSub) {
            const unsubResult = await browserSub.unsubscribe()
            pushLog('browser unsubscribe resultado', unsubResult)
          }
        } catch (e) { pushLog('unsubscribe browser falhou', e?.message) }
        await new Promise(r => setTimeout(r, 800))
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

      // Permissão: PULA OneSignal.requestPermission se já está granted (SDK trava no iOS)
      let granted
      if (Notification.permission === 'granted') {
        pushLog('permissão JÁ granted — pulando requestPermission (evita trava iOS)')
        granted = true
      } else {
        pushLog('chamando OneSignal.requestPermission')
        try {
          const permRes = await withTimeout(OneSignal.Notifications.requestPermission(), 10000, 'requestPermission')
          pushLog('requestPermission resultado', permRes)
          granted = permRes === true || permRes === 'granted' || Notification.permission === 'granted'
        } catch (e) {
          pushLog('requestPermission ERRO', e?.message)
          granted = Notification.permission === 'granted'
        }
      }
      pushLog('permission granted final?', granted)

      if (!granted) {
        setSubError(isIOS
          ? 'Permissão negada. Vá em Ajustes > GrindUP > Notificações e ative.'
          : 'Permissão negada. Habilite nas configurações do navegador.')
        setSubStatus('error')
        return false
      }

      setPermission('granted')

      // Opt-in explícito (idempotente)
      pushLog('estado antes do optIn', { optedIn: sub?.optedIn, id: sub?.id, hasToken: !!sub?.token })
      if (!sub?.optedIn) {
        try { sub?.optIn?.() ; pushLog('optIn chamado') } catch (e) { pushLog('optIn ERRO', e?.message) }
      }

      // Aguarda 5s pra ver se optIn funcionou. Se não, força via pushManager direto.
      await new Promise(r => setTimeout(r, 5000))
      pushLog('estado após 5s do optIn', { optedIn: sub?.optedIn, hasToken: !!sub?.token })

      if (!sub?.token) {
        pushLog('optIn não criou token — forçando pushManager.subscribe direto')
        try {
          const reg = await navigator.serviceWorker.ready
          // Tenta extrair VAPID key do OneSignal SDK
          let appServerKey = null
          try {
            // OneSignal SDK guarda a chave VAPID em vários lugares dependendo da versão
            appServerKey = OneSignal._initOptions?.safari_web_id ||
                           window.OneSignalDeferred?.[0]?.appId ||
                           null
          } catch {}
          // Se não conseguir, tenta subscribe sem applicationServerKey (usa default do SW)
          const browserSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
          })
          pushLog('pushManager.subscribe SUCESSO', { endpoint: browserSub?.endpoint?.slice(0, 50) })
          // Força OneSignal a reconhecer
          try { sub?.optIn?.() } catch {}
          await new Promise(r => setTimeout(r, 3000))
        } catch (e) {
          pushLog('pushManager.subscribe ERRO', e?.message)
        }
      }

      pushLog('aguardando subscription event final (até 30s)')
      const ok = await subscribed
      pushLog('subscription event resultado', { ok, id: sub?.id, hasToken: !!sub?.token, optedIn: sub?.optedIn })

      if (!ok) {
        const hasId = !!sub?.id
        const hasToken = !!sub?.token

        // Última tentativa: re-registra o SW do zero (resolve cache de subscription corrompida no iOS)
        if (forceFresh && hasId && !hasToken) {
          pushLog('ÚLTIMO RECURSO: re-registrando SW do zero')
          try {
            const regs = await navigator.serviceWorker.getRegistrations()
            pushLog('SWs encontrados antes do unregister', regs.length)
            for (const r of regs) await r.unregister()
            pushLog('todos SWs desregistrados')
            // Re-registra
            const newReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
            pushLog('SW re-registrado', { scope: newReg.scope })
            // Espera ativar
            if (newReg.installing) {
              await new Promise(resolve => {
                newReg.installing.addEventListener('statechange', e => {
                  if (e.target.state === 'activated') resolve()
                })
                setTimeout(resolve, 5000)
              })
            }
            // Tenta opt-in mais uma vez
            try { OneSignal.User?.PushSubscription?.optIn?.() ; pushLog('último optIn chamado') } catch (e) { pushLog('último optIn ERRO', e?.message) }
            await new Promise(r => setTimeout(r, 8000))

            const finalSub = OneSignal.User?.PushSubscription
            pushLog('estado após último recurso', { optedIn: finalSub?.optedIn, id: finalSub?.id, hasToken: !!finalSub?.token })
            if (finalSub?.optedIn && finalSub?.id && finalSub?.token) {
              try { await OneSignal.login(userId) } catch {}
              setSubStatus('subscribed')
              setPermission('granted')
              pushLog('SUCESSO no último recurso')
              return true
            }
          } catch (e) { pushLog('último recurso EXCEÇÃO', e?.message) }
        }

        let detail = ''
        if (hasId && !hasToken) {
          detail = ' — Token vazio. Veja "Mostrar diagnóstico" pra detalhes.'
        } else if (!hasId) {
          detail = ' — Subscription nem foi criada.'
        }
        pushLog('FALHA FINAL', { hasId, hasToken })
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
    } finally {
      clearTimeout(overallTimeout)
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

  // ── Reset nuclear: desregistra SW, apaga IndexedDB do OneSignal, limpa cache, reload ──
  // Use quando o estado fica travado em "ativando..." ou subscription corrompida.
  async function resetPushSystem() {
    pushLog('===== RESET NUCLEAR INICIADO =====')

    // 1) OneSignal: opt-out + logout
    try { await OneSignal.User?.PushSubscription?.optOut?.() ; pushLog('reset: optOut OK') } catch (e) { pushLog('reset: optOut falhou', e?.message) }
    try { await OneSignal.logout?.() ; pushLog('reset: logout OK') } catch (e) { pushLog('reset: logout falhou', e?.message) }

    // 2) Browser: unsubscribe push subscription
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      const sub = await reg?.pushManager?.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        pushLog('reset: pushManager.unsubscribe OK')
      }
    } catch (e) { pushLog('reset: unsubscribe falhou', e?.message) }

    // 3) Desregistra TODOS os service workers
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const r of regs) await r.unregister()
        pushLog('reset: SWs desregistrados', regs.length)
      }
    } catch (e) { pushLog('reset: unregister SW falhou', e?.message) }

    // 4) APAGA IndexedDB do OneSignal — onde está o estado zumbi
    try {
      if ('indexedDB' in window) {
        // OneSignal v16 usa esses DBs
        const dbsToDelete = [
          'ONE_SIGNAL_SDK_DB',
          'OneSignal',
          'OneSignalSDK',
          'OneSignalSDKv5',
        ]
        // Tenta usar databases() se disponível pra pegar TODOS os DBs
        let allDbs = []
        try {
          if (indexedDB.databases) {
            const list = await indexedDB.databases()
            allDbs = list.map(db => db.name).filter(Boolean)
          }
        } catch {}
        const toDelete = [...new Set([...dbsToDelete, ...allDbs])]
        for (const dbName of toDelete) {
          try {
            await new Promise((resolve) => {
              const req = indexedDB.deleteDatabase(dbName)
              req.onsuccess = () => resolve()
              req.onerror = () => resolve()
              req.onblocked = () => resolve()
              setTimeout(resolve, 2000)
            })
          } catch {}
        }
        pushLog('reset: IndexedDB apagado', toDelete.length)
      }
    } catch (e) { pushLog('reset: IndexedDB falhou', e?.message) }

    // 5) Limpa caches HTTP
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
        pushLog('reset: caches limpos', keys.length)
      }
    } catch (e) { pushLog('reset: caches falhou', e?.message) }

    // 6) Limpa localStorage do app (preserva auth do supabase)
    try {
      const preserved = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-')) preserved[k] = localStorage.getItem(k)
      }
      localStorage.clear()
      for (const k in preserved) localStorage.setItem(k, preserved[k])
      sessionStorage.clear()
      pushLog('reset: localStorage limpo (auth preservado)')
    } catch (e) { pushLog('reset: localStorage falhou', e?.message) }

    pushLog('===== RESET COMPLETO — recarregando =====')
    // Pequena pausa pra logs persistirem (mas localStorage acabou de ser limpo, então perdem)
    await new Promise(r => setTimeout(r, 300))
    window.location.href = '/?_pushreset=' + Date.now()
  }

  // ── Diagnóstico: dados pra debug ──
  async function getDiagnostics() {
    const sub = OneSignal.User?.PushSubscription
    const ua = navigator.userAgent
    const iosMatch = ua.match(/OS (\d+)_(\d+)/)
    const iosVersion = iosMatch ? `${iosMatch[1]}.${iosMatch[2]}` : null

    // Verdade absoluta: vai direto no browser, sem OneSignal
    let browserSubscription = null
    let swCount = 0
    let swList = []
    let controllerScript = null
    let swError = null
    try {
      const allRegs = await navigator.serviceWorker?.getRegistrations()
      swCount = allRegs?.length || 0
      swList = (allRegs || []).map(r => ({
        scope: r.scope,
        scriptURL: r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || null,
        state: r.active?.state || r.installing?.state || r.waiting?.state || 'unknown',
      }))
      controllerScript = navigator.serviceWorker?.controller?.scriptURL || null
      // Tenta pegar subscription do primeiro SW
      const reg = allRegs?.[0]
      if (reg) {
        const browserSub = await reg.pushManager?.getSubscription()
        if (browserSub) {
          browserSubscription = {
            endpoint: browserSub.endpoint?.slice(0, 60) + '...',
            hasKeys: !!browserSub.toJSON?.()?.keys,
            expirationTime: browserSub.expirationTime,
          }
        }
      }
    } catch (e) {
      swError = String(e?.message || e).slice(0, 100)
    }

    return {
      // OneSignal SDK
      subscriptionId: sub?.id || null,
      subscriptionToken: sub?.token ? sub.token.slice(0, 30) + '...' : null,
      optedIn: sub?.optedIn ?? null,
      onesignalId: OneSignal.User?.onesignalId || null,
      externalId: OneSignal.User?.externalId || null,
      // Browser-level (verdade absoluta)
      browserSubscription,
      browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
      // Service Worker
      swCount,
      swList,
      controllerScript,
      swError,
      // PWA / Device
      isStandalone: window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true,
      isIOS: /iphone|ipad|ipod/i.test(ua),
      iosVersion,
      hasServiceWorker: 'serviceWorker' in navigator,
      currentURL: window.location.href,
      origin: window.location.origin,
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
    resetPushSystem,
    getLog,
    clearLog,
  }
}
