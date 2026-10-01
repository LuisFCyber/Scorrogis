// IndexedDB wrapper para cache offline de dados geográficos
// Permite que o usuário visualize a última versão conhecida dos dados quando offline

const DB_NAME = "rotas-seguras-offline"
const DB_VERSION = 1

const STORES = {
  incidents: "incidents",
  shelters: "shelters",
  survivors: "survivors",
  meta: "meta",
} as const

type StoreName = keyof typeof STORES

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB não suportado"))
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORES.incidents)) {
        db.createObjectStore(STORES.incidents, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(STORES.shelters)) {
        db.createObjectStore(STORES.shelters, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(STORES.survivors)) {
        db.createObjectStore(STORES.survivors, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES[store], mode)
    const s = t.objectStore(STORES[store])
    const req = fn(s)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheIncidents(items: unknown[]): Promise<void> {
  try {
    const db = await openDB()
    const t = db.transaction(STORES.incidents, "readwrite")
    const s = t.objectStore(STORES.incidents)
    s.clear()
    items.forEach((i) => s.put(i))
    const mt = db.transaction(STORES.meta, "readwrite")
    mt.objectStore(STORES.meta).put({
      key: "incidents_last_sync",
      value: Date.now(),
      count: items.length,
    })
  } catch (err) {
    console.warn("[offline] Falha ao cachear incidentes:", err)
  }
}

export async function cacheShelters(items: unknown[]): Promise<void> {
  try {
    const db = await openDB()
    const t = db.transaction(STORES.shelters, "readwrite")
    const s = t.objectStore(STORES.shelters)
    s.clear()
    items.forEach((i) => s.put(i))
    const mt = db.transaction(STORES.meta, "readwrite")
    mt.objectStore(STORES.meta).put({
      key: "shelters_last_sync",
      value: Date.now(),
      count: items.length,
    })
  } catch (err) {
    console.warn("[offline] Falha ao cachear abrigos:", err)
  }
}

export async function cacheSurvivors(items: unknown[]): Promise<void> {
  try {
    const db = await openDB()
    const t = db.transaction(STORES.survivors, "readwrite")
    const s = t.objectStore(STORES.survivors)
    s.clear()
    items.forEach((i) => s.put(i))
    const mt = db.transaction(STORES.meta, "readwrite")
    mt.objectStore(STORES.meta).put({
      key: "survivors_last_sync",
      value: Date.now(),
      count: items.length,
    })
  } catch (err) {
    console.warn("[offline] Falha ao cachear sobreviventes:", err)
  }
}

export async function getCachedIncidents<T = unknown>(): Promise<T[]> {
  try {
    return (await tx(STORES.incidents, "readonly", (s) => s.getAll())) as T[]
  } catch {
    return []
  }
}

export async function getCachedShelters<T = unknown>(): Promise<T[]> {
  try {
    return (await tx(STORES.shelters, "readonly", (s) => s.getAll())) as T[]
  } catch {
    return []
  }
}

export async function getCachedSurvivors<T = unknown>(): Promise<T[]> {
  try {
    return (await tx(STORES.survivors, "readonly", (s) => s.getAll())) as T[]
  } catch {
    return []
  }
}

export async function getMeta(key: string): Promise<{ value: number; count: number } | null> {
  try {
    const r = await tx(STORES.meta, "readonly", (s) => s.get(key))
    return r as { value: number; count: number } | null
  } catch {
    return null
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB()
    const t = db.transaction(
      [STORES.incidents, STORES.shelters, STORES.survivors, STORES.meta],
      "readwrite",
    )
    t.objectStore(STORES.incidents).clear()
    t.objectStore(STORES.shelters).clear()
    t.objectStore(STORES.survivors).clear()
    t.objectStore(STORES.meta).clear()
  } catch (err) {
    console.warn("[offline] Falha ao limpar cache:", err)
  }
}
