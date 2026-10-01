'use client'

import { CloudOff, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface OfflineBannerProps {
  online: boolean
  lastSync: { incidents: number | null; shelters: number | null; survivors: number | null }
}

export default function OfflineBanner({ online, lastSync }: OfflineBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [showOfflineMsg, setShowOfflineMsg] = useState(false)

  // Mostra banner offline após 2s offline (evita flicker em conexões oscilantes)
  useEffect(() => {
    if (!online) {
      const t = setTimeout(() => setShowOfflineMsg(true), 2000)
      return () => clearTimeout(t)
    }
    setShowOfflineMsg(false)
    setDismissed(false)
  }, [online])

  if (online || dismissed || !showOfflineMsg) return null

  const lastSyncTime = Math.max(
    lastSync.incidents ?? 0,
    lastSync.shelters ?? 0,
    lastSync.survivors ?? 0,
  )
  const min = lastSyncTime ? Math.floor((Date.now() - lastSyncTime) / 60000) : null
  const lastSyncStr =
    min === null ? 'Dados em cache' :
    min < 1 ? 'agora mesmo' :
    min < 60 ? `${min}min atrás` :
    `${Math.floor(min / 60)}h atrás`

  return (
    <div
      className="absolute top-14 left-1/2 -translate-x-1/2 z-[650] bg-amber-500 text-white px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2 text-sm font-medium max-w-[90vw] animate-in slide-in-from-top-2 duration-300"
      role="alert"
    >
      <CloudOff size={16} />
      <span>
        Modo offline — exibindo dados de cache (última atualização: {lastSyncStr})
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
        aria-label="Dispensar"
      >
        ✕
      </button>
    </div>
  )
}
