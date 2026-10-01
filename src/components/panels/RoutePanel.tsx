'use client'

import { useEffect, useState } from 'react'
import { Navigation, X, Clock, Route as RouteIcon, AlertTriangle, Loader2 } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RouteResult } from '@/types/geo'

export default function RoutePanel() {
  const routeOrigin = useMapStore((s) => s.routeOrigin)
  const routeDestination = useMapStore((s) => s.routeDestination)
  const route = useMapStore((s) => s.route)
  const setRoute = useMapStore((s) => s.setRoute)
  const setRouteOrigin = useMapStore((s) => s.setRouteOrigin)
  const setRouteDestination = useMapStore((s) => s.setRouteDestination)
  const setCreationMode = useMapStore((s) => s.setCreationMode)

  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCalculate = routeOrigin != null && routeDestination != null

  const calculate = async () => {
    if (!canCalculate) return
    setCalculating(true)
    setError(null)
    try {
      const from = `${routeOrigin![0]},${routeOrigin![1]}`
      const to = `${routeDestination![0]},${routeDestination![1]}`
      const res = await fetch(`/api/route?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Falha ao calcular rota')
      const r: RouteResult = await res.json()
      setRoute(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setCalculating(false)
    }
  }

  const clearRoute = () => {
    setRoute(null)
    setRouteOrigin(null)
    setRouteDestination(null)
    setCreationMode({ kind: 'none' })
  }

  // Auto-calcular quando origem e destino estiverem definidos
  useEffect(() => {
    if (routeOrigin != null && routeDestination != null && !route && !calculating) {
      calculate()
    }
  }, [routeOrigin, routeDestination, route, calculating, calculate])

  if (!routeOrigin && !routeDestination && !route) return null

  return (
    <div className="absolute bottom-24 left-4 right-4 sm:right-auto sm:w-96 z-[550] bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <RouteIcon size={16} className="text-primary" />
          <span>Rota Segura</span>
        </div>
        <button
          onClick={clearRoute}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-600" />
          <span className="text-muted-foreground">Origem:</span>
          {routeOrigin ? (
            <span className="font-mono text-xs">
              {routeOrigin[1].toFixed(4)}, {routeOrigin[0].toFixed(4)}
            </span>
          ) : (
            <button
              onClick={() => setCreationMode({ kind: 'route-origin' })}
              className="text-primary text-xs underline"
            >
              Clique para definir
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600" />
          <span className="text-muted-foreground">Destino:</span>
          {routeDestination ? (
            <span className="font-mono text-xs">
              {routeDestination[1].toFixed(4)}, {routeDestination[0].toFixed(4)}
            </span>
          ) : (
            <button
              onClick={() => setCreationMode({ kind: 'route-destination' })}
              className="text-primary text-xs underline"
            >
              Clique para definir
            </button>
          )}
        </div>
      </div>

      {route && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/40 rounded-md p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <RouteIcon size={12} /> Distância
              </div>
              <div className="font-semibold">{route.distanceKm.toFixed(2)} km</div>
            </div>
            <div className="bg-muted/40 rounded-md p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={12} /> Tempo estimado
              </div>
              <div className="font-semibold">{route.estimatedTimeMin} min</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={route.routeType === 'direct' ? 'default' : 'secondary'}>
              {route.routeType === 'direct' ? 'Rota direta (segura)' : `Desvio (${route.routeSide === 'left' ? 'esquerda' : 'direita'})`}
            </Badge>
            {route.nearbyIncidents && route.nearbyIncidents.length > 0 && (
              <Badge variant="destructive">
                {route.nearbyIncidents.length} alerta(s) próximos
              </Badge>
            )}
          </div>

          {route.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-xs space-y-1">
              {route.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {route.avoidedIncidents.length > 0 && (
            <div className="text-xs text-muted-foreground">
              ✓ {route.avoidedIncidents.length} incidente(s) evitado(s) nesta rota
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-destructive">{error}</div>
      )}

      {calculating && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Calculando rota...
        </div>
      )}

      {canCalculate && !route && !calculating && (
        <Button onClick={calculate} size="sm" className="mt-3 w-full">
          <Navigation size={14} className="mr-1" /> Calcular Rota
        </Button>
      )}
    </div>
  )
}
