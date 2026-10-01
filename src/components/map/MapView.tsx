'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import 'leaflet.heat'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap, useMap as useMapHook } from 'react-leaflet'
import { useMapStore, DEFAULT_CENTER, DEFAULT_ZOOM, INCIDENT_META, URGENCY_META, CAPACITY_LABEL } from '@/lib/store'
import type { Incident, Shelter, SurvivorSignal, HelpRequest, HelpCategory, HelpUrgency } from '@/types/geo'
import { HELP_CATEGORY_META, HELP_URGENCY_META, HELP_STATUS_META, VULNERABLE_GROUP_LABELS } from '@/types/geo'
import HelpRequestPopup from '@/components/panels/HelpRequestPopup'

// Corrige bug dos ícones do Leaflet no webpack
// Cria um divIcon customizado (mais flexível que o default)
function makeDivIcon(html: string, className: string) {
  return L.divIcon({
    html,
    className,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

function incidentIcon(type: string, verified: boolean): L.DivIcon {
  const meta = INCIDENT_META[type as keyof typeof INCIDENT_META] ?? {
    label: '?',
    color: '#6b7280',
  }
  const ringColor = verified ? '#16a34a' : meta.color
  return makeDivIcon(
    `<div style="
      width: 28px; height: 28px;
      background: ${meta.color};
      border: 3px solid ${ringColor};
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 12px;
    ">${verified ? '✓' : '!'}</div>`,
    'incident-marker',
  )
}

function shelterIcon(type: string, capacityStatus: string): L.DivIcon {
  const colors: Record<string, string> = {
    shelter: '#2563eb',
    hospital: '#dc2626',
    food_distribution: '#16a34a',
    checkpoint: '#9333ea',
  }
  const color = colors[type] ?? '#2563eb'
  const ringColor =
    capacityStatus === 'full' ? '#dc2626' :
    capacityStatus === 'limited' ? '#f59e0b' :
    '#16a34a'
  const emoji =
    type === 'hospital' ? '＋' :
    type === 'food_distribution' ? '🍜' :
    type === 'checkpoint' ? '◉' :
    '🏠'
  return makeDivIcon(
    `<div style="
      width: 30px; height: 30px;
      background: ${color};
      border: 3px solid ${ringColor};
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px;
    ">${emoji}</div>`,
    'shelter-marker',
  )
}

function survivorIcon(urgency: string, anonymize: boolean): L.DivIcon {
  const meta = URGENCY_META[urgency as keyof typeof URGENCY_META] ?? {
    label: '?',
    color: '#6b7280',
  }
  return makeDivIcon(
    `<div style="
      width: 26px; height: 26px;
      background: ${meta.color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 12px; font-weight: bold;
    ">${anonymize ? '?' : '✚'}</div>`,
    'survivor-marker',
  )
}

function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 20px; height: 20px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(37,99,235,0.25), 0 0 0 12px rgba(37,99,235,0.1);
    "></div>`,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function originIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 24px; height: 24px;
      background: #16a34a;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      color: white; font-weight: bold; font-size: 11px;
      display: flex; align-items: center; justify-content: center;
    ">A</div>`,
    className: 'origin-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function destinationIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 24px; height: 24px;
      background: #dc2626;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      color: white; font-weight: bold; font-size: 11px;
      display: flex; align-items: center; justify-content: center;
    ">B</div>`,
    className: 'destination-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Marcador para pedido de ajuda: cor por urgência + selo visual
function helpRequestIcon(
  category: HelpCategory,
  urgency: HelpUrgency,
  verified: 'none' | 'community' | 'official',
): L.DivIcon {
  const catMeta = HELP_CATEGORY_META[category]
  const urgMeta = HELP_URGENCY_META[urgency]
  // Tamanho cresce com urgência
  const size = urgency === 'critical' ? 36 : urgency === 'high' ? 32 : 28
  const ringColor = verified === 'official' ? '#16a34a' : verified === 'community' ? '#3b82f6' : urgMeta.color
  const ringWidth = verified !== 'none' ? 4 : 3
  const emoji =
    category === 'rescue' ? '🆘' :
    category === 'medical' ? '✚' :
    category === 'supplies' ? '📦' :
    category === 'shelter' ? '🏠' :
    category === 'transport' ? '🚐' : '?'
  const badge = verified === 'official'
    ? '<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#16a34a;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:8px;font-weight:bold;">✓</div>'
    : verified === 'community'
      ? '<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#3b82f6;border:2px solid white;border-radius:50%;"></div>'
      : ''
  return makeDivIcon(
    `<div style="
      position:relative;
      width:${size}px;height:${size}px;
      background:${catMeta.color};
      border:${ringWidth}px solid ${ringColor};
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:${size > 30 ? 16 : 14}px;
    ">${emoji}${badge}</div>`,
    'help-request-marker',
  )
}

// Componente para renderizar Heatmap layer (leaflet.heat)
function HeatmapLayer() {
  const heatmap = useMapStore((s) => s.heatmap)
  const layers = useMapStore((s) => s.layers)
  const map = useMapHook()

  useEffect(() => {
    if (!map) return
    if (!layers.heatmap) {
      // Remove qualquer layer de heat existente
      map.eachLayer((layer) => {
        if (layer instanceof (L as unknown as { heatLayer?: unknown }).heatLayer) {
          map.removeLayer(layer)
        }
      })
      return
    }
    // Remove heat antigo
    map.eachLayer((layer) => {
      if (layer instanceof (L as unknown as { heatLayer?: unknown }).heatLayer) {
        map.removeLayer(layer)
      }
    })
    if (heatmap.length === 0) return

    // Adiciona novo
    const points: [number, number, number][] = heatmap.map((p) => [p.lat, p.lng, p.intensity])
    const heatLayer = (L as unknown as { heatLayer: (pts: [number, number, number][], opts: Record<string, unknown>) => L.Layer })
      .heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.3,
        gradient: {
          0.0: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          1.0: 'red',
        },
      })
    heatLayer.addTo(map)
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, heatmap, layers.heatmap])

  return null
}

// Componente interno que captura cliques no mapa
function MapClickHandler() {
  const creationMode = useMapStore((s) => s.creationMode)
  const setCreationMode = useMapStore((s) => s.setCreationMode)
  const setRouteOrigin = useMapStore((s) => s.setRouteOrigin)
  const setRouteDestination = useMapStore((s) => s.setRouteDestination)

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      // Callback registrado externamente (página principal) via store global
      const externalCb = (globalThis as Record<string, unknown>).__onMapClick as
        | ((lat: number, lng: number) => void)
        | null
      if (externalCb) {
        externalCb(lat, lng)
        return
      }
      // Fallback: trata criação interna (rotas)
      switch (creationMode.kind) {
        case 'route-origin':
          setRouteOrigin([lng, lat])
          setCreationMode({ kind: 'route-destination' })
          break
        case 'route-destination':
          setRouteDestination([lng, lat])
          setCreationMode({ kind: 'none' })
          break
        default:
          break
      }
    },
  })
  return null
}

// Componente para recentrar o mapa quando o usuário pede geolocation
function RecenterOnUser() {
  const userLocation = useMapStore((s) => s.userLocation)
  const map = useMap()
  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation[1], userLocation[0]], 15, { animate: true })
    }
  }, [userLocation, map])
  return null
}

export default function MapView() {
  const incidents = useMapStore((s) => s.incidents)
  const shelters = useMapStore((s) => s.shelters)
  const survivors = useMapStore((s) => s.survivors)
  const helpRequests = useMapStore((s) => s.helpRequests)
  const route = useMapStore((s) => s.route)
  const layers = useMapStore((s) => s.layers)
  const filters = useMapStore((s) => s.filters)
  const helpFilters = useMapStore((s) => s.helpFilters)
  const creationMode = useMapStore((s) => s.creationMode)
  const userLocation = useMapStore((s) => s.userLocation)
  const routeOrigin = useMapStore((s) => s.routeOrigin)
  const routeDestination = useMapStore((s) => s.routeDestination)
  const setSelected = useMapStore((s) => s.setSelected)
  const selectedHelpRequestId = useMapStore((s) => s.selectedHelpRequestId)

  // Filtra incidentes conforme camada + filtros
  const visibleIncidents = useMemo(() => {
    if (!layers.incidents) return []
    return incidents.filter((i) => {
      if (!filters.types.includes(i.type)) return false
      if (filters.onlyVerified && !i.verified) return false
      if (filters.onlyActive && i.expiresAt) {
        const expired = new Date(i.expiresAt).getTime() < Date.now()
        if (expired) return false
      }
      return true
    })
  }, [incidents, layers.incidents, filters])

  const visibleShelters = useMemo(
    () => (layers.shelters ? shelters.filter((s) => s.isActive) : []),
    [shelters, layers.shelters],
  )

  const visibleSurvivors = useMemo(() => {
    if (!layers.survivors) return []
    return survivors.filter((s) => !s.isResolved)
  }, [survivors, layers.survivors])

  const visibleHelpRequests = useMemo(() => {
    if (!layers.helpRequests) return []
    return helpRequests.filter((h) => {
      if (!helpFilters.categories.includes(h.category)) return false
      if (!helpFilters.urgencies.includes(h.urgency)) return false
      if (!helpFilters.statuses.includes(h.status)) return false
      if (helpFilters.onlyActive && h.expiresAt) {
        const expired = new Date(h.expiresAt).getTime() < Date.now()
        if (expired) return false
      }
      return true
    })
  }, [helpRequests, layers.helpRequests, helpFilters])

  const cursorClass =
    creationMode.kind !== 'none' ? 'cursor-crosshair' : ''

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className={`w-full h-full ${cursorClass}`}
      attributionControl
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <MapClickHandler />
      <RecenterOnUser />
      <HeatmapLayer />

      {/* Incidentes */}
      {visibleIncidents.map((i) => (
        <Marker
          key={i.id}
          position={[i.latitude, i.longitude]}
          icon={incidentIcon(i.type, i.verified)}
          eventHandlers={{ click: () => setSelected('incident', i.id) }}
        >
          <Popup>
            <IncidentPopup incident={i} />
          </Popup>
        </Marker>
      ))}

      {/* Abrigos */}
      {visibleShelters.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={shelterIcon(s.type, s.capacityStatus)}
          eventHandlers={{ click: () => setSelected('shelter', s.id) }}
        >
          <Popup>
            <ShelterPopup shelter={s} />
          </Popup>
        </Marker>
      ))}

      {/* Sobreviventes */}
      {visibleSurvivors.map((sv) => (
        <Marker
          key={sv.id}
          position={[sv.latitude, sv.longitude]}
          icon={survivorIcon(sv.urgencyLevel, sv.anonymize)}
          eventHandlers={{ click: () => setSelected('survivor', sv.id) }}
        >
          <Popup>
            <SurvivorPopup survivor={sv} />
          </Popup>
        </Marker>
      ))}

      {/* Pedidos de Ajuda */}
      {visibleHelpRequests.map((h) => {
        const verified: 'none' | 'community' | 'official' = h.officialVerified
          ? 'official'
          : h.communityVerified
            ? 'community'
            : 'none'
        return (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={helpRequestIcon(h.category, h.urgency, verified)}
            eventHandlers={{ click: () => setSelected('help-request', h.id) }}
          >
            <Popup>
              <HelpRequestPopup
                request={selectedHelpRequestId === h.id ? h : h}
                onClose={() => setSelected(null, null)}
              />
            </Popup>
          </Marker>
        )
      })}

      {/* Localização do usuário */}
      {userLocation && (
        <Marker position={[userLocation[1], userLocation[0]]} icon={userLocationIcon()}>
          <Popup>Você está aqui</Popup>
        </Marker>
      )}

      {/* Origem e destino da rota */}
      {routeOrigin && (
        <Marker position={[routeOrigin[1], routeOrigin[0]]} icon={originIcon()}>
          <Popup>Origem</Popup>
        </Marker>
      )}
      {routeDestination && (
        <Marker position={[routeDestination[1], routeDestination[0]]} icon={destinationIcon()}>
          <Popup>Destino</Popup>
        </Marker>
      )}

      {/* Polilinha da rota calculada */}
      {route && (
        <Polyline
          positions={route.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          pathOptions={{
            color: route.routeType === 'direct' ? '#16a34a' : '#f59e0b',
            weight: 5,
            opacity: 0.85,
            dashArray: route.routeType === 'detour' ? '8 6' : undefined,
          }}
        />
      )}
    </MapContainer>
  )
}

function IncidentPopup({ incident }: { incident: Incident }) {
  const meta = INCIDENT_META[incident.type]
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 600, color: meta.color, marginBottom: 4 }}>
        {meta.label}
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
        Severidade: {incident.severity} • {incident.verified ? '✓ Verificado' : 'Não verificado'}
      </div>
      {incident.description && (
        <div style={{ marginBottom: 6 }}>{incident.description}</div>
      )}
      <div style={{ fontSize: 11, opacity: 0.7 }}>
        👍 {incident.upvotes} • 👎 {incident.downvotes}
      </div>
      {incident.expiresAt && (
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          Expira: {new Date(incident.expiresAt).toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  )
}

function ShelterPopup({ shelter }: { shelter: Shelter }) {
  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{shelter.name}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4, textTransform: 'capitalize' }}>
        {shelter.type.replace('_', ' ')} • Capacidade: {CAPACITY_LABEL[shelter.capacityStatus]}
      </div>
      {shelter.capacityTotal > 0 && (
        <div style={{ fontSize: 11, marginBottom: 4 }}>
          Vagas: {shelter.capacityTotal - shelter.capacityUsed}/{shelter.capacityTotal}
        </div>
      )}
      {shelter.suppliesNeeded.length > 0 && (
        <div style={{ fontSize: 11, marginBottom: 4 }}>
          <strong>Suprimentos necessários:</strong>
          <ul style={{ paddingLeft: 16, margin: '2px 0' }}>
            {shelter.suppliesNeeded.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {shelter.contactInfo?.phone && (
        <div style={{ fontSize: 11 }}>
          📞 <a href={`tel:${shelter.contactInfo.phone}`}>{shelter.contactInfo.phone}</a>
        </div>
      )}
      {shelter.notes && (
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4, fontStyle: 'italic' }}>
          {shelter.notes}
        </div>
      )}
    </div>
  )
}

function SurvivorPopup({ survivor }: { survivor: SurvivorSignal }) {
  const meta = URGENCY_META[survivor.urgencyLevel]
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 600, color: meta.color, marginBottom: 4 }}>
        Sinal de Sobrevivente
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{meta.label}</div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>
        Pessoas: {survivor.peopleCount}
      </div>
      {survivor.anonymize && (
        <div style={{ fontSize: 10, opacity: 0.6, fontStyle: 'italic', marginTop: 4 }}>
          Localização aproximada (anonimizada)
        </div>
      )}
    </div>
  )
}
