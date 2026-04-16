const APP_NAME = 'GrindUP'
const CACHE_NAME = 'grindupv3'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => e.waitUntil(
  Promise.all([
    clients.claim(),
    // Delete all old caches so stale JS is never served
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  ])
))

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

// ── FETCH STRATEGY ──
// Network-first for HTML (always get fresh index.html with new script hashes)
// Cache-first for hashed assets (JS/CSS - immutable filenames)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  const url = new URL(event.request.url)
  const isHTML = url.pathname === '/' || url.pathname.endsWith('.html')
  const isHashedAsset = /\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)

  if (isHTML) {
    // Network-first: always try to get fresh HTML
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  } else if (isHashedAsset) {
    // Cache-first: hashed assets are immutable
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          return res
        })
      })
    )
  } else {
    // Network-first for everything else (icons, manifest, sw.js)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})
