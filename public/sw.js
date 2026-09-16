/* Kistly Service Worker
 * Aufgaben: App-Huelle offline halten, Push-Benachrichtigungen anzeigen,
 * Anrufe so lange erneut melden, wie es klingelt.
 * Bewusst ohne Build-Schritt, damit hier nichts still auseinanderlaeuft.
 */
const VERSION = 'kistly-v2'
const SHELL = `${VERSION}-shell`

/* Die App kann unter einem Unterordner liegen (GitHub Pages liefert unter
 * /kistly/ aus). Der eigene Geltungsbereich verraet den Pfad, damit steht
 * er an genau einer Stelle und muss nirgends fest eingetragen werden. */
const BASE = new URL(self.registration.scope).pathname
const SHELL_FILES = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon.svg`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[sw] precache fehlgeschlagen', err)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigation: erst Netz, sonst die gecachte Huelle.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(`${BASE}index.html`).then((r) => r || Response.error()),
      ),
    )
    return
  }

  // Statische Dateien: erst Cache, dann Netz und nachlegen.
  if (url.pathname.startsWith(`${BASE}assets/`) || url.pathname.startsWith(`${BASE}icons/`)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(SHELL).then((c) => c.put(req, copy))
            return res
          }),
      ),
    )
  }
})

/* --------------------------------------------------------------- Push */
function parsePush(event) {
  if (!event.data) return { title: 'Kistly', body: '' }
  try {
    return event.data.json()
  } catch {
    return { title: 'Kistly', body: event.data.text() }
  }
}

async function showCall(payload) {
  // Solange der Anruf laeuft, immer wieder melden. Der Anrufer schickt
  // zusaetzlich alle paar Sekunden einen neuen Push, das hier ist die
  // Absicherung, falls der Service Worker zwischendurch schlaeft.
  const tag = payload.tag || 'kistly-call'
  for (let i = 0; i < 6; i++) {
    const open = await self.registration.getNotifications({ tag })
    if (i > 0 && open.length === 0) return // wurde weggetippt
    await self.registration.showNotification(payload.title || 'Anruf', {
      body: payload.body || 'Eingehender Anruf',
      tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [400, 200, 400, 200, 400],
      icon: `${BASE}icons/icon-192.png`,
      badge: `${BASE}icons/favicon-32.png`,
      data: payload.data || {},
      actions: [
        { action: 'accept', title: 'Annehmen' },
        { action: 'decline', title: 'Ablehnen' },
      ],
    })
    await new Promise((r) => setTimeout(r, 5000))
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePush(event)
  if (payload.type === 'call') {
    event.waitUntil(showCall(payload))
    return
  }
  if (payload.type === 'call-cancel') {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: payload.tag || 'kistly-call' })
        .then((ns) => ns.forEach((n) => n.close())),
    )
    return
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Kistly', {
      body: payload.body || '',
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      icon: payload.icon || `${BASE}icons/icon-192.png`,
      badge: `${BASE}icons/favicon-32.png`,
      image: payload.image,
      vibrate: [120, 60, 120],
      data: payload.data || {},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  const action = event.action
  event.notification.close()

  /* Die Adressen im Push sind relativ zur App gedacht, darum kommt der
   * Basispfad hier davor. Sonst landet ein Tipp auf die Meldung unter
   * /app statt unter /kistly/app. */
  const inApp = (u) => (u ? `${BASE}${String(u).replace(/^\//, '')}` : `${BASE}app`)
  let target = inApp(data.url)
  if (action === 'accept' && data.callUrl) target = inApp(data.callUrl)
  if (action === 'decline') target = `${inApp(data.url)}?call=decline&id=${data.callId || ''}`

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', action, data })
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
