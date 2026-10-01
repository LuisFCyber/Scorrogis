'use client'

import { useState } from 'react'
import { AlertTriangle, MapPin, LifeBuoy, Navigation, Plus, X, LocateFixed } from 'lucide-react'
import { useMapStore } from '@/lib/store'

export default function QuickActions() {
  const [open, setOpen] = useState(false)
  const setCreationMode = useMapStore((s) => s.setCreationMode)
  const creationMode = useMapStore((s) => s.creationMode)
  const setUserLocation = useMapStore((s) => s.setUserLocation)
  const setRoute = useMapStore((s) => s.setRoute)
  const setRouteOrigin = useMapStore((s) => s.setRouteOrigin)
  const setRouteDestination = useMapStore((s) => s.setRouteDestination)

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste dispositivo.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
      },
      (err) => alert('Não foi possível obter sua localização: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const startIncident = () => {
    setCreationMode({ kind: 'incident' })
    setOpen(false)
  }
  const startSurvivor = () => {
    setCreationMode({ kind: 'survivor' })
    setOpen(false)
  }
  const startRoute = () => {
    setRoute(null)
    setRouteOrigin(null)
    setRouteDestination(null)
    setCreationMode({ kind: 'route-origin' })
    setOpen(false)
  }
  const cancelMode = () => {
    setCreationMode({ kind: 'none' })
    setRouteOrigin(null)
    setRouteDestination(null)
    setRoute(null)
  }

  const isCreating = creationMode.kind !== 'none'

  return (
    <>
      {/* Banner de modo de criação ativo */}
      {isCreating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[600] bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium">
          <span>
            {creationMode.kind === 'incident' && '📍 Clique no mapa para reportar um incidente'}
            {creationMode.kind === 'shelter' && '🏠 Clique no mapa para cadastrar um abrigo'}
            {creationMode.kind === 'survivor' && '🆘 Clique no mapa para sinalizar pessoa ilhada'}
            {creationMode.kind === 'route-origin' && 'A) Clique no ponto de origem'}
            {creationMode.kind === 'route-destination' && 'B) Clique no ponto de destino'}
          </span>
          <button
            onClick={cancelMode}
            className="bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
            aria-label="Cancelar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* FAB principal */}
      <div className="absolute bottom-4 right-4 z-[600] flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <FabAction
              onClick={startIncident}
              icon={<AlertTriangle size={18} />}
              label="Reportar Situação"
              color="#ef4444"
            />
            <FabAction
              onClick={startSurvivor}
              icon={<LifeBuoy size={18} />}
              label="Estou Ilhado / Ajuda"
              color="#7f1d1d"
            />
            <FabAction
              onClick={startRoute}
              icon={<Navigation size={18} />}
              label="Calcular Rota Segura"
              color="#22c55e"
            />
            <FabAction
              onClick={handleLocate}
              icon={<LocateFixed size={18} />}
              label="Minha Localização"
              color="#2563eb"
            />
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 ${
            open
              ? 'bg-destructive rotate-45'
              : 'bg-gradient-to-br from-red-500 to-rose-700'
          }`}
          aria-label={open ? 'Fechar ações' : 'Abrir ações rápidas'}
        >
          {open ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>
    </>
  )
}

function FabAction({
  onClick,
  icon,
  label,
  color,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-card shadow-lg rounded-full pl-2 pr-4 py-2 hover:scale-105 transition-transform border border-border"
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
        style={{ background: color }}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  )
}
