'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useMapStore } from '@/lib/store'
import { useRealtime } from '@/lib/realtime/useRealtime'
import { useOfflineSync } from '@/lib/offline/useOfflineSync'
import Header from '@/components/panels/Header'
import OfflineBanner from '@/components/panels/OfflineBanner'
import QuickFilters from '@/components/panels/QuickFilters'
import QuickActions from '@/components/panels/QuickActions'
import QuickForm from '@/components/panels/QuickForm'
import HelpRequestForm from '@/components/panels/HelpRequestForm'
import RoutePanel from '@/components/panels/RoutePanel'
import { Button } from '@/components/ui/button'
import { Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Incident, Shelter, SurvivorSignal, HelpRequest, HeatmapPoint } from '@/types/geo'

// Leaflet precisa de window - carrega apenas no cliente
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <Loader2 className="animate-spin text-muted-foreground" />
    </div>
  ),
})

export default function Home() {
  const creationMode = useMapStore((s) => s.creationMode)
  const setCreationMode = useMapStore((s) => s.setCreationMode)
  const setIncidents = useMapStore((s) => s.setIncidents)
  const setShelters = useMapStore((s) => s.setShelters)
  const setSurvivors = useMapStore((s) => s.setSurvivors)
  const setHelpRequests = useMapStore((s) => s.setHelpRequests)
  const setHeatmap = useMapStore((s) => s.setHeatmap)
  const setHeatmapLoading = useMapStore((s) => s.setHeatmapLoading)
  const layers = useMapStore((s) => s.layers)
  const helpFilters = useMapStore((s) => s.helpFilters)
  const loading = useMapStore((s) => s.loading)
  const setLoading = useMapStore((s) => s.setLoading)

  // Habilita real-time e offline sync
  useRealtime()
  const { online, lastSync, pendingSync } = useOfflineSync()

  const [formOpen, setFormOpen] = useState(false)
  const [helpFormOpen, setHelpFormOpen] = useState(false)
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [seeding, setSeeding] = useState(false)
  const heatmapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [incRes, shRes, svRes, hrRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/shelters'),
        fetch('/api/survivors'),
        fetch('/api/help-requests'),
      ])
      const incData = await incRes.json()
      const shData = await shRes.json()
      const svData = await svRes.json()
      const hrData = await hrRes.json()
      setIncidents((incData.incidents ?? []) as Incident[])
      setShelters((shData.shelters ?? []) as Shelter[])
      setSurvivors((svData.survivors ?? []) as SurvivorSignal[])
      setHelpRequests((hrData.helpRequests ?? []) as HelpRequest[])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Falha ao carregar dados online', {
        description: 'Exibindo última versão em cache.',
      })
    } finally {
      setLoading(false)
    }
  }, [setIncidents, setShelters, setSurvivors, setHelpRequests, setLoading])

  const loadHeatmap = useCallback(async () => {
    if (!layers.heatmap) return
    setHeatmapLoading(true)
    try {
      // Busca com bbox amplo (Franca e arredores)
      const bbox = '-47.6,-20.7,-47.2,-20.35'
      const params = new URLSearchParams({ bbox })
      // Aplica filtros ativos
      if (helpFilters.categories.length === 1) {
        params.set('category', helpFilters.categories[0])
      }
      if (helpFilters.urgencies.length === 1) {
        params.set('urgency', helpFilters.urgencies[0])
      }
      const res = await fetch(`/api/heatmap?${params}`)
      if (!res.ok) return
      const data = await res.json()
      const points: HeatmapPoint[] = (data.points ?? []).map((p: { lng: number; lat: number; count: number; intensity: number }) => ({
        lng: p.lng,
        lat: p.lat,
        count: p.count,
        intensity: p.intensity,
      }))
      setHeatmap(points)
    } catch (err) {
      console.error('Erro ao carregar heatmap:', err)
    } finally {
      setHeatmapLoading(false)
    }
  }, [layers.heatmap, helpFilters, setHeatmap, setHeatmapLoading])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Carrega heatmap quando ativado, e atualiza a cada 60s
  useEffect(() => {
    if (heatmapTimerRef.current) {
      clearInterval(heatmapTimerRef.current)
      heatmapTimerRef.current = null
    }
    if (layers.heatmap) {
      loadHeatmap()
      heatmapTimerRef.current = setInterval(loadHeatmap, 60_000) // 1 min
    }
    return () => {
      if (heatmapTimerRef.current) {
        clearInterval(heatmapTimerRef.current)
        heatmapTimerRef.current = null
      }
    }
  }, [layers.heatmap, loadHeatmap])

  // Registra handler global para cliques no mapa (durante modo de criação)
  useEffect(() => {
    const handler = (lat: number, lng: number) => {
      if (creationMode.kind === 'incident' || creationMode.kind === 'survivor') {
        setPendingPoint({ lat, lng })
        setFormOpen(true)
      } else if (creationMode.kind === 'help-request') {
        setPendingPoint({ lat, lng })
        setHelpFormOpen(true)
      } else if (creationMode.kind === 'route-origin') {
        useMapStore.getState().setRouteOrigin([lng, lat])
        setCreationMode({ kind: 'route-destination' })
      } else if (creationMode.kind === 'route-destination') {
        useMapStore.getState().setRouteDestination([lng, lat])
        setCreationMode({ kind: 'none' })
      }
    }
    ;(globalThis as Record<string, unknown>).__onMapClick = handler
    return () => {
      ;(globalThis as Record<string, unknown>).__onMapClick = null
    }
  }, [creationMode, setCreationMode])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await fetch('/api/seed', { method: 'POST' })
      await loadAll()
      if (layers.heatmap) await loadHeatmap()
      toast.success('Dados de exemplo carregados!')
    } finally {
      setSeeding(false)
    }
  }

  const formType: 'incident' | 'survivor' =
    creationMode.kind === 'survivor' ? 'survivor' : 'incident'

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      <Header online={online} lastSync={lastSync} pendingSync={pendingSync} />

      <div className="absolute top-14 inset-x-0 bottom-0">
        <MapView />
      </div>

      <OfflineBanner online={online} lastSync={lastSync} />

      <QuickFilters />
      <QuickActions />

      <RoutePanel />

      {/* Botão de seed (apenas se não houver dados) */}
      <div className="absolute bottom-4 left-4 z-[550]">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          disabled={seeding}
          className="bg-card/95 backdrop-blur-sm shadow-md text-xs"
        >
          {seeding ? <Loader2 size={14} className="animate-spin mr-1" /> : <Database size={14} className="mr-1" />}
          {seeding ? 'Carregando...' : 'Dados de exemplo (Franca/SP)'}
        </Button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[600] bg-card shadow-lg rounded-full px-4 py-2 text-xs flex items-center gap-2 border border-border">
          <Loader2 size={14} className="animate-spin" />
          Carregando dados...
        </div>
      )}

      {/* Formulário de incidente/sobrevivente (modal) */}
      <QuickForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setPendingPoint(null)
            setCreationMode({ kind: 'none' })
          }
        }}
        formType={formType}
        lat={pendingPoint?.lat ?? null}
        lng={pendingPoint?.lng ?? null}
      />

      {/* Formulário de pedido de ajuda (modal) */}
      <HelpRequestForm
        open={helpFormOpen}
        onOpenChange={(open) => {
          setHelpFormOpen(open)
          if (!open) {
            setPendingPoint(null)
            setCreationMode({ kind: 'none' })
          }
        }}
        lat={pendingPoint?.lat ?? null}
        lng={pendingPoint?.lng ?? null}
      />
    </main>
  )
}
