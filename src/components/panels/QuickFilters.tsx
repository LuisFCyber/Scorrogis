'use client'

import { Shield, Waves, House, Mountain, Truck, CheckCircle2, Droplet, Home, Hospital, Soup, MapPin, HeartHandshake } from 'lucide-react'
import { useMapStore, INCIDENT_META } from '@/lib/store'
import type { IncidentType } from '@/types/geo'

export default function QuickFilters() {
  const layers = useMapStore((s) => s.layers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)
  const filters = useMapStore((s) => s.filters)
  const toggleFilterType = useMapStore((s) => s.toggleFilterType)

  return (
    <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2 bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border p-2 max-w-[180px]">
      <div className="text-xs font-semibold text-muted-foreground px-1 pt-1">CAMADAS</div>

      <FilterButton
        active={layers.incidents}
        onClick={() => toggleLayer('incidents')}
        color="#ef4444"
        icon={<Waves size={14} />}
        label="Incidentes"
      />
      <FilterButton
        active={layers.shelters}
        onClick={() => toggleLayer('shelters')}
        color="#2563eb"
        icon={<Home size={14} />}
        label="Abrigos"
      />
      <FilterButton
        active={layers.survivors}
        onClick={() => toggleLayer('survivors')}
        color="#7f1d1d"
        icon={<HeartHandshake size={14} />}
        label="Sobreviventes"
      />
      <FilterButton
        active={layers.safeRoutes}
        onClick={() => toggleLayer('safeRoutes')}
        color="#22c55e"
        icon={<Shield size={14} />}
        label="Rotas Seguras"
      />

      <div className="h-px bg-border my-1" />

      <div className="text-xs font-semibold text-muted-foreground px-1">FILTRAR TIPOS</div>
      {(Object.keys(INCIDENT_META) as IncidentType[]).map((t) => {
        const meta = INCIDENT_META[t]
        const active = filters.types.includes(t)
        return (
          <FilterButton
            key={t}
            active={active}
            onClick={() => toggleFilterType(t)}
            color={meta.color}
            icon={iconForType(t)}
            label={meta.label}
          />
        )
      })}
    </div>
  )
}

function iconForType(type: IncidentType) {
  switch (type) {
    case 'flood': return <Droplet size={14} />
    case 'landslide': return <Mountain size={14} />
    case 'safe_passage': return <CheckCircle2 size={14} />
    case 'roadblock': return <Truck size={14} />
  }
}

function FilterButton({
  active,
  onClick,
  color,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  color: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors w-full text-left ${
        active
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/40 text-muted-foreground hover:bg-muted'
      }`}
      style={active ? { borderLeft: `3px solid ${color}` } : { borderLeft: '3px solid transparent' }}
    >
      <span style={{ color: active ? color : undefined }}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
