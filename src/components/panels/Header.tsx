'use client'

import { useState, useEffect } from 'react'
import { Activity, CloudRain, Wifi, WifiOff, RefreshCw, Clock, AlertCircle } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  online: boolean
  lastSync: { incidents: number | null; shelters: number | null; survivors: number | null }
  pendingSync: number
}

export default function Header({ online, lastSync, pendingSync }: HeaderProps) {
  const incidents = useMapStore((s) => s.incidents)
  const shelters = useMapStore((s) => s.shelters)
  const survivors = useMapStore((s) => s.survivors)

  const activeIncidents = incidents.filter((i) => {
    if (!i.expiresAt) return true
    return new Date(i.expiresAt).getTime() > Date.now()
  })

  const lastSyncTime = Math.max(
    lastSync.incidents ?? 0,
    lastSync.shelters ?? 0,
    lastSync.survivors ?? 0,
  )

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return null
    const diff = Date.now() - ts
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'agora'
    if (min < 60) return `${min}min atrás`
    const h = Math.floor(min / 60)
    return `${h}h atrás`
  }

  const lastSyncStr = formatTimeAgo(lastSyncTime || null)

  return (
    <header className="absolute top-0 left-0 right-0 z-[700] bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-red-600 flex items-center justify-center">
          <CloudRain size={16} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">Rotas Seguras</div>
          <div className="text-[10px] text-muted-foreground hidden sm:block">
            Plataforma colaborativa de resposta a desastres
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <Badge variant="outline" className="hidden sm:flex text-xs">
          <Activity size={11} className="mr-1" />
          {activeIncidents.length} ativos
        </Badge>
        <Badge variant="outline" className="hidden md:flex text-xs">
          🏠 {shelters.length}
        </Badge>
        <Badge variant="outline" className="hidden md:flex text-xs">
          🆘 {survivors.length}
        </Badge>

        {lastSyncStr && (
          <Badge variant="outline" className="hidden lg:flex text-xs text-muted-foreground">
            <Clock size={11} className="mr-1" />
            {lastSyncStr}
          </Badge>
        )}

        {pendingSync > 0 && (
          <Badge variant="destructive" className="text-xs animate-pulse">
            <RefreshCw size={11} className="mr-1 animate-spin" />
            {pendingSync} pendente(s)
          </Badge>
        )}

        <Badge
          variant={online ? 'default' : 'destructive'}
          className="text-xs"
        >
          {online ? <Wifi size={11} className="mr-1" /> : <WifiOff size={11} className="mr-1" />}
          {online ? 'Online' : 'Offline'}
        </Badge>
      </div>
    </header>
  )
}
