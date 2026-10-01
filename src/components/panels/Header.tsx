'use client'

import { useState, useEffect } from 'react'
import { Activity, CloudRain, Wifi, WifiOff, Menu } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Header() {
  const incidents = useMapStore((s) => s.incidents)
  const shelters = useMapStore((s) => s.shelters)
  const survivors = useMapStore((s) => s.survivors)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const activeIncidents = incidents.filter((i) => {
    if (!i.expiresAt) return true
    return new Date(i.expiresAt).getTime() > Date.now()
  })

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

      <div className="flex items-center gap-1.5">
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
