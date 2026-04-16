const APP_NAME = 'GrindUP'
const CACHE_NAME = 'grindupv2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  const data = event.data?.json?.() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || APP_NAME, {
      body: data.body || 'Hora das missões! 🔥',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-32.png',
      vibrate: [100, 50, 100],
      tag: 'grindupreminder',
      renotify: true,
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Abrir app' },
      ],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); return existing.navigate(url) }
      return clients.openWindow(url)
    })
  )
})

// ── OFFLINE CACHE (basic shell) ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})
