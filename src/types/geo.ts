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
  helpRequests: boolean
  heatmap: boolean
}

export interface IncidentFilters {
  types: IncidentType[]
  onlyVerified: boolean
  onlyActive: boolean
}

// ============================================================================
//  PEDIDOS DE AJUDA
// ============================================================================

export type HelpCategory = 'rescue' | 'supplies' | 'medical' | 'shelter' | 'transport'
export type HelpUrgency = 'low' | 'medium' | 'high' | 'critical'
export type HelpStatus =
  | 'pending'
  | 'analyzing'
  | 'validated'
  | 'in_progress'
  | 'resolved'
  | 'cancelled'

export type VulnerableGroup = 'criancas' | 'idosos' | 'gestantes' | 'pcd' | 'outros'

export interface HelpRequest {
  id: string
  category: HelpCategory
  urgency: HelpUrgency
  status: HelpStatus
  longitude: number
  latitude: number
  description: string | null
  peopleCount: number
  vulnerableGroups: VulnerableGroup[]
  hasAnimals: boolean
  animalCount: number
  animalDescription: string | null
  // Contato é opcionalmente retornado pela API (server-only, depende do contexto)
  contact: { phone?: string; whatsapp?: string; name?: string } | null
  photos: string[]
  validationCount: number
  denyCount: number
  communityVerified: boolean
  officialVerified: boolean
  authorToken: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  location: GeoPoint
}

export interface HelpRequestValidation {
  id: string
  requestId: string
  vote: boolean
  comment: string | null
  createdAt: string
}

export interface HelpRequestFilters {
  categories: HelpCategory[]
  urgencies: HelpUrgency[]
  statuses: HelpStatus[]
  onlyActive: boolean
}

// Metadados visuais
export const HELP_CATEGORY_META: Record<
  HelpCategory,
  { label: string; color: string; icon: string }
> = {
  rescue: { label: 'Resgate', color: '#dc2626', icon: 'life-buoy' },
  supplies: { label: 'Suprimentos', color: '#f59e0b', icon: 'package' },
  medical: { label: 'Médico', color: '#7c3aed', icon: 'heart-pulse' },
  shelter: { label: 'Abrigo', color: '#0ea5e9', icon: 'home' },
  transport: { label: 'Transporte', color: '#16a34a', icon: 'truck' },
}

export const HELP_URGENCY_META: Record<
  HelpUrgency,
  { label: string; color: string; weight: number }
> = {
  low: { label: 'Baixa', color: '#3b82f6', weight: 1 },
  medium: { label: 'Média', color: '#f59e0b', weight: 2 },
  high: { label: 'Alta', color: '#ea580c', weight: 3 },
  critical: { label: 'Crítica', color: '#dc2626', weight: 4 },
}

export const HELP_STATUS_META: Record<
  HelpStatus,
  { label: string; color: string }
> = {
  pending: { label: 'Pendente', color: '#6b7280' },
  analyzing: { label: 'Em análise', color: '#f59e0b' },
  validated: { label: 'Validado', color: '#10b981' },
  in_progress: { label: 'Em atendimento', color: '#3b82f6' },
  resolved: { label: 'Resolvido', color: '#16a34a' },
  cancelled: { label: 'Cancelado', color: '#9ca3af' },
}

export const VULNERABLE_GROUP_LABELS: Record<VulnerableGroup, string> = {
  criancas: 'Crianças',
  idosos: 'Idosos',
  gestantes: 'Gestantes',
  pcd: 'Pessoas com deficiência',
  outros: 'Outros',
}

// Heatmap point (returned by /api/heatmap)
export interface HeatmapPoint {
  lng: number
  lat: number
  count: number
  intensity: number // 0-1 normalizado
}
