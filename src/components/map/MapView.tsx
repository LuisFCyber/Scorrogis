'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet'
import { useMapStore, DEFAULT_CENTER, DEFAULT_ZOOM, INCIDENT_META, URGENCY_META, CAPACITY_LABEL } from '@/lib/store'
import type { Incident, Shelter, SurvivorSignal } from '@/types/geo'

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
  const route = useMapStore((s) => s.route)
  const layers = useMapStore((s) => s.layers)
  const filters = useMapStore((s) => s.filters)
  const creationMode = useMapStore((s) => s.creationMode)
  const userLocation = useMapStore((s) => s.userLocation)
  const routeOrigin = useMapStore((s) => s.routeOrigin)
  const routeDestination = useMapStore((s) => s.routeDestination)
  const setSelected = useMapStore((s) => s.setSelected)

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
