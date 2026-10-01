'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMapStore } from '@/lib/store'
import {
  cacheIncidents, cacheShelters, cacheSurvivors,
  getCachedIncidents, getCachedShelters, getCachedSurvivors,
  getMeta,
} from '@/lib/offline/db'
import type { Incident, Shelter, SurvivorSignal } from '@/types/geo'

interface OfflineState {
  online: boolean
  lastSync: {
    incidents: number | null
    shelters: number | null
    survivors: number | null
  }
  pendingSync: number
}

export function useOfflineSync() {
  const setIncidents = useMapStore((s) => s.setIncidents)
  const setShelters = useMapStore((s) => s.setShelters)
  const setSurvivors = useMapStore((s) => s.setSurvivors)
  const incidents = useMapStore((s) => s.incidents)
  const shelters = useMapStore((s) => s.shelters)
  const survivors = useMapStore((s) => s.survivors)

  const [state, setState] = useState<OfflineState>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSync: { incidents: null, shelters: null, survivors: null },
    pendingSync: 0,
  })

  // Carrega cache local na inicialização (fallback se API falhar)
  const loadFromCache = useCallback(async () => {
    try {
      const [inc, sh, sv, incMeta, shMeta, svMeta] = await Promise.all([
        getCachedIncidents<Incident>(),
        getCachedShelters<Shelter>(),
        getCachedSurvivors<SurvivorSignal>(),
        getMeta('incidents_last_sync'),
        getMeta('shelters_last_sync'),
        getMeta('survivors_last_sync'),
      ])
      if (inc.length > 0) setIncidents(inc)
      if (sh.length > 0) setShelters(sh)
      if (sv.length > 0) setSurvivors(sv)
      setState((s) => ({
        ...s,
        lastSync: {
          incidents: incMeta?.value ?? null,
          shelters: shMeta?.value ?? null,
          survivors: svMeta?.value ?? null,
        },
      }))
      console.log('[offline] Cache carregado:', inc.length, sh.length, sv.length)
    } catch (err) {
      console.warn('[offline] Erro ao carregar cache:', err)
    }
  }, [setIncidents, setShelters, setSurvivors])

  // Persiste dados no cache sempre que mudam
  useEffect(() => {
    if (incidents.length > 0) cacheIncidents(incidents)
  }, [incidents])

  useEffect(() => {
    if (shelters.length > 0) cacheShelters(shelters)
  }, [shelters])

  useEffect(() => {
    if (survivors.length > 0) cacheSurvivors(survivors)
  }, [survivors])

  // Listeners online/offline
  useEffect(() => {
    const onOnline = () => {
      setState((s) => ({ ...s, online: true }))
      // Tenta sincronizar fila pendente via Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'sync-now' })
      }
    }
    const onOffline = () => setState((s) => ({ ...s, online: false }))

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Mensagens do Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      const data = event.data
      if (!data) return
      if (data.type === 'offline-queued') {
        setState((s) => ({ ...s, pendingSync: data.count }))
      } else if (data.type === 'offline-synced') {
        setState((s) => ({ ...s, pendingSync: data.remaining }))
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  // Carrega cache na montagem (apenas uma vez)
  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => loadFromCache())
      .then(() => {
        if (cancelled) return
      })
      .catch((err) => console.warn('[offline] loadFromCache falhou:', err))
    return () => {
      cancelled = true
    }
  }, [loadFromCache])

  return {
    online: state.online,
    lastSync: state.lastSync,
    pendingSync: state.pendingSync,
    loadFromCache,
  }
}
