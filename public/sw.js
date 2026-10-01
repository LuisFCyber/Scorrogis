// Service Worker - Plataforma Rotas Seguras
// Estratégias:
// - Tiles OSM: CacheFirst (tiles são imutáveis por URL)
// - Assets estáticos (JS/CSS/imagens): StaleWhileRevalidate
// - API GET: NetworkFirst com fallback para cache
// - API POST: quando offline, armazena em fila para sync posterior

const CACHE_VERSION = "rotas-seguras-v1"
const TILE_CACHE = "osm-tiles-v1"
const API_CACHE = "api-data-v1"
const OFFLINE_QUEUE = "offline-queue"

const ASSETS_TO_PRECACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
]

// Instalação: pré-cacheia assets críticos
self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS_TO_PRECACHE))
  )
})

// Ativação: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => ![CACHE_VERSION, TILE_CACHE, API_CACHE, OFFLINE_QUEUE].includes(n))
          .map((n) => caches.delete(n))
      )
    )
  )
  self.clients.claim()
})

// Helpers
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    return cached || new Response("Offline", { status: 503 })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => cached)
  return cached || fetchPromise
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: "offline", incidents: [], shelters: [], survivors: [] }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }
}

// Fila offline para POST
async function queueOfflineRequest(request) {
  const cache = await caches.open(OFFLINE_QUEUE)
  const body = await request.clone().text()
  const queueItem = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    timestamp: Date.now(),
  }
  // Armazena como Response fake para iterar depois
  const fakeResponse = new Response(JSON.stringify(queueItem), {
    headers: { "Content-Type": "application/json" },
  })
  const key = new Request(`offline:${Date.now()}:${Math.random()}`)
  await cache.put(key, fakeResponse)
  // Avisa clientes que há items pendentes
  const clients = await self.clients.matchAll()
  const pendingCount = (await cache.keys()).length
  clients.forEach((c) =>
    c.postMessage({ type: "offline-queued", count: pendingCount })
  )
}

async function processOfflineQueue() {
  const cache = await caches.open(OFFLINE_QUEUE)
  const keys = await cache.keys()
  let processed = 0
  for (const key of keys) {
    const res = await cache.match(key)
    const item = JSON.parse(await res.text())
    try {
      const r = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      })
      if (r.ok) {
        await cache.delete(key)
        processed++
      } else {
        // Se falhou com 4xx, não adianta reter - descarta
        if (r.status >= 400 && r.status < 500) await cache.delete(key)
      }
    } catch (err) {
      // Rede ainda indisponível - mantém na fila
      break
    }
  }
  if (processed > 0) {
    const clients = await self.clients.matchAll()
    const remaining = (await cache.keys()).length
    clients.forEach((c) => c.postMessage({ type: "offline-synced", processed, remaining }))
  }
}

// Intercepta requisições
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Apenas GET e POST
  if (!["GET", "POST"].includes(request.method)) return

  // Tiles OSM: CacheFirst
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(request, TILE_CACHE))
    return
  }

  // WebSocket: não interceptar
  if (request.url.startsWith("ws://") || request.url.startsWith("wss://")) return

  // API POST quando offline: fila
  if (request.method === "POST" && url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          // Tenta online primeiro
          const res = await fetch(request)
          if (!res.ok && res.status === 0) throw new Error("offline")
          return res
        } catch (err) {
          // Verifica conectividade via fetch de cabeçalho (navigator não existe no SW)
          try {
            await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" })
            // Se chegou aqui, está online - re-lança o erro original
            throw err
          } catch {
            await queueOfflineRequest(request)
            return new Response(
              JSON.stringify({ queued: true, message: "Salvo localmente. Será enviado quando voltar online." }),
              { status: 202, headers: { "Content-Type": "application/json" } }
            )
          }
        }
      })()
    )
    return
  }

  // API GET: NetworkFirst com fallback
  if (request.method === "GET" && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Assets estáticos: StaleWhileRevalidate
  if (request.method === "GET") {
    event.respondWith(staleWhileRevalidate(request, CACHE_VERSION))
    return
  }
})

// Sincronização em background
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-queue") {
    event.waitUntil(processOfflineQueue())
  }
})

// Mensagens do cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "sync-now") {
    event.waitUntil(processOfflineQueue())
  }
  if (event.data && event.data.type === "skip-waiting") {
    self.skipWaiting()
  }
})
