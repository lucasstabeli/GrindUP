importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')

const APP_NAME = 'GrindUP'
const CACHE_NAME = 'grindupv17'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => e.waitUntil(
  Promise.all([
    clients.claim(),
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  ])
))

// ── FETCH STRATEGY ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  const url = new URL(event.request.url)
  const isHTML = url.pathname === '/' || url.pathname.endsWith('.html')
  const isHashedAsset = /\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)

  if (isHTML) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  } else if (isHashedAsset) {
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
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})
