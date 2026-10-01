'use client'

import { create } from 'zustand'
import type {
  Incident,
  Shelter,
  SurvivorSignal,
  RouteResult,
  LayerVisibility,
  IncidentFilters,
  IncidentType,
  IncidentSeverity,
  SurvivorUrgency,
} from '@/types/geo'

// Coordenadas padrão (centro de Franca/SP)
export const DEFAULT_CENTER: [number, number] = [-20.5389, -47.4008]
export const DEFAULT_ZOOM = 14

// Modo de criação no mapa
export type CreationMode =
  | { kind: 'none' }
  | { kind: 'incident' }
  | { kind: 'shelter' }
  | { kind: 'survivor' }
  | { kind: 'route-origin' }
  | { kind: 'route-destination' }

interface MapStore {
  // Camadas visíveis
  layers: LayerVisibility
  toggleLayer: (key: keyof LayerVisibility) => void
  setLayers: (layers: LayerVisibility) => void

  // Filtros de incidentes
  filters: IncidentFilters
  toggleFilterType: (type: IncidentType) => void
  setOnlyVerified: (v: boolean) => void

  // Dados carregados
  incidents: Incident[]
  shelters: Shelter[]
  survivors: SurvivorSignal[]
  route: RouteResult | null

  setIncidents: (list: Incident[]) => void
  setShelters: (list: Shelter[]) => void
  setSurvivors: (list: SurvivorSignal[]) => void
  setRoute: (r: RouteResult | null) => void

  // Add um novo elemento (de WebSocket, por exemplo)
  addIncident: (i: Incident) => void
  addSurvivor: (s: SurvivorSignal) => void
  updateShelter: (s: Shelter) => void
  updateIncidentVotes: (id: string, upvotes: number, downvotes: number, verified: boolean) => void

  // Modo de criação (clique no mapa)
  creationMode: CreationMode
  setCreationMode: (m: CreationMode) => void

  // Origem/destino da rota
  routeOrigin: [number, number] | null // [lng, lat]
  routeDestination: [number, number] | null
  setRouteOrigin: (p: [number, number] | null) => void
  setRouteDestination: (p: [number, number] | null) => void

  // Marker selecionado (para popups)
  selectedIncidentId: string | null
  selectedShelterId: string | null
  selectedSurvivorId: string | null
  setSelected: (kind: 'incident' | 'shelter' | 'survivor' | null, id: string | null) => void

  // Loading flags
  loading: boolean
  setLoading: (v: boolean) => void

  // Última localização do usuário (geolocation)
  userLocation: [number, number] | null // [lng, lat]
  setUserLocation: (p: [number, number] | null) => void
}

export const useMapStore = create<MapStore>((set) => ({
  layers: {
    incidents: true,
    shelters: true,
    survivors: true,
    safeRoutes: false,
  },
  toggleLayer: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setLayers: (layers) => set({ layers }),

  filters: {
    types: ['flood', 'landslide', 'safe_passage', 'roadblock'],
    onlyVerified: false,
    onlyActive: true,
  },
  toggleFilterType: (type) =>
    set((s) => {
      const has = s.filters.types.includes(type)
      return {
        filters: {
          ...s.filters,
          types: has
            ? s.filters.types.filter((t) => t !== type)
            : [...s.filters.types, type],
        },
      }
    }),
  setOnlyVerified: (v) => set((s) => ({ filters: { ...s.filters, onlyVerified: v } })),

  incidents: [],
  shelters: [],
  survivors: [],
  route: null,

  setIncidents: (list) => set({ incidents: list }),
  setShelters: (list) => set({ shelters: list }),
  setSurvivors: (list) => set({ survivors: list }),
  setRoute: (r) => set({ route: r }),

  addIncident: (i) =>
    set((s) => ({ incidents: [i, ...s.incidents.filter((x) => x.id !== i.id)] })),
  addSurvivor: (sv) =>
    set((s) => ({ survivors: [sv, ...s.survivors.filter((x) => x.id !== sv.id)] })),
  updateShelter: (sh) =>
    set((s) => ({ shelters: s.shelters.map((x) => (x.id === sh.id ? sh : x)) })),
  updateIncidentVotes: (id, upvotes, downvotes, verified) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id ? { ...x, upvotes, downvotes, verified } : x,
      ),
    })),

  creationMode: { kind: 'none' },
  setCreationMode: (m) => set({ creationMode: m }),

  routeOrigin: null,
  routeDestination: null,
  setRouteOrigin: (p) => set({ routeOrigin: p }),
  setRouteDestination: (p) => set({ routeDestination: p }),

  selectedIncidentId: null,
  selectedShelterId: null,
  selectedSurvivorId: null,
  setSelected: (kind, id) =>
    set({
      selectedIncidentId: kind === 'incident' ? id : null,
      selectedShelterId: kind === 'shelter' ? id : null,
      selectedSurvivorId: kind === 'survivor' ? id : null,
    }),

  loading: false,
  setLoading: (v) => set({ loading: v }),

  userLocation: null,
  setUserLocation: (p) => set({ userLocation: p }),
}))

// Helpers exportados para configuração visual dos marcadores
export const INCIDENT_META: Record<
  IncidentType,
  { label: string; color: string; icon: string }
> = {
  flood: { label: 'Alagamento', color: '#1e90ff', icon: 'waves' },
  landslide: { label: 'Deslizamento', color: '#8b4513', icon: 'mountain' },
  safe_passage: { label: 'Rota Segura', color: '#22c55e', icon: 'shield-check' },
  roadblock: { label: 'Via Bloqueada', color: '#ef4444', icon: 'roadblock' },
}

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

export const URGENCY_META: Record<
  SurvivorUrgency,
  { label: string; color: string }
> = {
  safe_waiting: { label: 'Aguardando água baixar', color: '#3b82f6' },
  need_medical: { label: 'Necessita atendimento médico', color: '#f59e0b' },
  need_evacuation: { label: 'Necessita evacuação', color: '#ef4444' },
  critical: { label: 'Crítico - resgate imediato', color: '#7f1d1d' },
}

export const CAPACITY_LABEL: Record<string, string> = {
  available: 'Disponível',
  limited: 'Limitado',
  full: 'Lotado',
  unknown: 'Indefinido',
}
