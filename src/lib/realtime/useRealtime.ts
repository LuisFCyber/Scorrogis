'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMapStore } from '@/lib/store'
import type { Incident, Shelter, SurvivorSignal } from '@/types/geo'

let socket: Socket | null = null

function getSocket(): Socket {
  if (socket) return socket
  socket = io('/?XTransformPort=3003', {
    path: '/',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  })
  return socket
}

export function useRealtime() {
  const addIncident = useMapStore((s) => s.addIncident)
  const addSurvivor = useMapStore((s) => s.addSurvivor)
  const updateShelter = useMapStore((s) => s.updateShelter)
  const updateIncidentVotes = useMapStore((s) => s.updateIncidentVotes)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const s = getSocket()
    socketRef.current = s

    const onIncidentCreated = (event: { payload: Incident }) => {
      if (event?.payload) addIncident(event.payload)
    }
    const onSurvivorCreated = (event: { payload: SurvivorSignal }) => {
      if (event?.payload) addSurvivor(event.payload)
    }
    const onShelterUpdated = (event: { payload: Shelter }) => {
      if (event?.payload) updateShelter(event.payload)
    }
    const onIncidentVoted = (event: {
      payload: { incidentId: string; vote: boolean }
    }) => {
      // Recarrega votos via API - o store não tem info suficiente localmente
      // Em produção com Supabase, podemos usar Realtime channel
    }

    s.on('incident:created', onIncidentCreated)
    s.on('survivor:created', onSurvivorCreated)
    s.on('shelter:updated', onShelterUpdated)
    s.on('incident:voted', onIncidentVoted)

    return () => {
      s.off('incident:created', onIncidentCreated)
      s.off('survivor:created', onSurvivorCreated)
      s.off('shelter:updated', onShelterUpdated)
      s.off('incident:voted', onIncidentVoted)
    }
  }, [addIncident, addSurvivor, updateShelter, updateIncidentVotes])

  return {
    emitIncidentCreate: (payload: Incident) => {
      getSocket().emit('incident:create', payload)
    },
    emitSurvivorCreate: (payload: SurvivorSignal) => {
      getSocket().emit('survivor:create', payload)
    },
    emitShelterUpdate: (payload: Shelter) => {
      getSocket().emit('shelter:update', payload)
    },
    emitIncidentVote: (incidentId: string, vote: boolean) => {
      getSocket().emit('incident:vote', { incidentId, vote })
    },
  }
}
