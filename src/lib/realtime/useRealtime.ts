'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useMapStore, INCIDENT_META, URGENCY_META } from '@/lib/store'
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
      if (event?.payload) {
        addIncident(event.payload)
        const meta = INCIDENT_META[event.payload.type]
        toast.warning(`Novo alerta: ${meta?.label ?? 'incidente'}`, {
          description: event.payload.description || 'Toque no marcador para detalhes.',
          duration: 6000,
        })
      }
    }
    const onSurvivorCreated = (event: { payload: SurvivorSignal }) => {
      if (event?.payload) {
        addSurvivor(event.payload)
        const meta = URGENCY_META[event.payload.urgencyLevel]
        toast.error(`Sinal de socorro: ${meta?.label ?? 'urgência'}`, {
          description: `${event.payload.peopleCount} pessoa(s) aguardando ajuda.`,
          duration: 8000,
        })
      }
    }
    const onShelterUpdated = (event: { payload: Shelter }) => {
      if (event?.payload) {
        updateShelter(event.payload)
        toast.info(`Abrigo atualizado: ${event.payload.name}`, {
          description: `Capacidade: ${event.payload.capacityStatus}`,
          duration: 4000,
        })
      }
    }
    const onIncidentVoted = (event: {
      payload: { incidentId: string; vote: boolean }
    }) => {
      // Recarrega votos via API
      if (event?.payload) {
        fetch(`/api/incidents`)
          .then((r) => r.json())
          .then((data) => {
            const inc = (data.incidents ?? []).find(
              (i: Incident) => i.id === event.payload.incidentId,
            )
            if (inc) {
              updateIncidentVotes(inc.id, inc.upvotes, inc.downvotes, inc.verified)
            }
          })
          .catch(() => {})
      }
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
