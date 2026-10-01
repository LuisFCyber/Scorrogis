// Tipos compartilhados entre cliente e servidor (Plataforma Rotas Seguras)

export type IncidentType = 'flood' | 'landslide' | 'safe_passage' | 'roadblock'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ShelterType = 'shelter' | 'hospital' | 'food_distribution' | 'checkpoint'
export type CapacityStatus = 'available' | 'limited' | 'full' | 'unknown'
export type SurvivorUrgency = 'safe_waiting' | 'need_medical' | 'need_evacuation' | 'critical'

export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface Incident {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  longitude: number
  latitude: number
  description: string | null
  upvotes: number
  downvotes: number
  verified: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  location: GeoPoint
}

export interface Shelter {
  id: string
  name: string
  type: ShelterType
  longitude: number
  latitude: number
  capacityTotal: number
  capacityUsed: number
  capacityStatus: CapacityStatus
  contactInfo: { phone?: string; whatsapp?: string; email?: string } | null
  suppliesNeeded: string[]
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  location: GeoPoint
}

export interface SurvivorSignal {
  id: string
  peopleCount: number
  urgencyLevel: SurvivorUrgency
  longitude: number
  latitude: number
  isResolved: boolean
  anonymize: boolean
  expiresAt: string | null
  createdAt: string
  location: GeoPoint
}

export interface RouteResult {
  success: boolean
  routeType: 'direct' | 'detour'
  routeSide?: 'right' | 'left'
  distanceKm: number
  estimatedTimeMin: number
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  avoidedIncidents: string[]
  nearbyIncidents?: { id: string; type: string; distanceM: number }[]
  warnings: string[]
}

export interface LayerVisibility {
  incidents: boolean
  shelters: boolean
  survivors: boolean
  safeRoutes: boolean
}

export interface IncidentFilters {
  types: IncidentType[]
  onlyVerified: boolean
  onlyActive: boolean
}
