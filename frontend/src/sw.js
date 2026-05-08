import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Skip waiting so new SW takes over immediately on update
self.skipWaiting()
self.clients.claim()

// Cache-first for Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// /api/* — never cache, always network
// (no registerRoute needed — falls through to network by default)

// SPA navigation fallback — serve index.html for all non-API navigations
registerRoute(
  new NavigationRoute(
    async ({ request }) => {
      try {
        return await fetch(request)
      } catch {
        const cache = await caches.open('workbox-precache-v2')
        return (await cache.match('/index.html')) || Response.error()
      }
    },
    { denylist: [/^\/api\//, /\/manifest\.json$/, /\/icons\//, /\/offline\.html$/] }
  )
)

// Push notification handler
self.addEventListener('push', (event) => {
  let title = 'Sir Spendalot'
  let body = 'A prophecy awaits thy attention.'

  if (event.data) {
    try {
      const data = event.data.json()
      title = data.title || title
      body = data.body || body
    } catch {
      body = event.data.text() || body
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  )
})

// Notification click — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
