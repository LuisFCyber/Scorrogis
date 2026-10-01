'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, LifeBuoy, Loader2 } from 'lucide-react'
import { useMapStore, INCIDENT_META, URGENCY_META } from '@/lib/store'
import { useRealtime } from '@/lib/realtime/useRealtime'
import type {
  IncidentType, IncidentSeverity, SurvivorUrgency, Incident, SurvivorSignal,
} from '@/types/geo'

interface QuickFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formType: 'incident' | 'survivor'
  lat: number | null
  lng: number | null
}

export default function QuickForm({ open, onOpenChange, formType, lat, lng }: QuickFormProps) {
  const setCreationMode = useMapStore((s) => s.setCreationMode)
  const addIncident = useMapStore((s) => s.addIncident)
  const addSurvivor = useMapStore((s) => s.addSurvivor)
  const realtime = useRealtime()

  const [incidentType, setIncidentType] = useState<IncidentType>('flood')
  const [severity, setSeverity] = useState<IncidentSeverity>('medium')
  const [description, setDescription] = useState('')

  const [peopleCount, setPeopleCount] = useState(1)
  const [urgencyLevel, setUrgencyLevel] = useState<SurvivorUrgency>('safe_waiting')
  const [anonymize, setAnonymize] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setDescription('')
      setPeopleCount(1)
      setUrgencyLevel('safe_waiting')
      setSeverity('medium')
      setIncidentType('flood')
    }
  }, [open])

  const handleSubmit = async () => {
    if (lat == null || lng == null) {
      setError('Coordenadas inválidas. Clique no mapa novamente.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      if (formType === 'incident') {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: incidentType,
            severity,
            longitude: lng,
            latitude: lat,
            description,
          }),
        })
        if (!res.ok) throw new Error('Falha ao criar incidente')
        const incident: Incident = await res.json()
        addIncident(incident)
        realtime.emitIncidentCreate(incident)
      } else {
        const res = await fetch('/api/survivors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peopleCount,
            urgencyLevel,
            longitude: lng,
            latitude: lat,
            anonymize,
          }),
        })
        if (!res.ok) throw new Error('Falha ao criar sinal de socorro')
        const survivor: SurvivorSignal = await res.json()
        addSurvivor(survivor)
        realtime.emitSurvivorCreate(survivor)
      }

      setCreationMode({ kind: 'none' })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setCreationMode({ kind: 'none' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formType === 'incident' ? (
              <>
                <AlertTriangle size={18} className="text-destructive" />
                Reportar Situação
              </>
            ) : (
              <>
                <LifeBuoy size={18} className="text-destructive" />
                Sinal de Socorro
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {formType === 'incident'
              ? 'Reporte um alagamento, bloqueio ou rota segura.'
              : 'Sinalize pessoas ilhadas que precisam de resgate.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Localização */}
          <div className="bg-muted/50 rounded-md p-2 text-xs">
            📍 Localização: {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Não definida'}
          </div>

          {formType === 'incident' ? (
            <>
              <div className="space-y-2">
                <Label>Tipo de ocorrência</Label>
                <RadioGroup
                  value={incidentType}
                  onValueChange={(v) => setIncidentType(partialIncidentType(v))}
                  className="grid grid-cols-2 gap-2"
                >
                  {(Object.keys(INCIDENT_META) as IncidentType[]).map((t) => (
                    <label
                      key={t}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        incidentType === t
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem value={t} id={`type-${t}`} />
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: INCIDENT_META[t].color }}
                      />
                      <span className="text-sm">{INCIDENT_META[t].label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Severidade</Label>
                <RadioGroup
                  value={severity}
                  onValueChange={(v) => setSeverity(partialSeverity(v))}
                  className="grid grid-cols-4 gap-2"
                >
                  {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map((s) => (
                    <label
                      key={s}
                      className={`text-center p-2 rounded-md border cursor-pointer text-xs capitalize transition-colors ${
                        severity === s
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem value={s} id={`sev-${s}`} className="sr-only" />
                      {s === 'low' ? 'Baixa' : s === 'medium' ? 'Média' : s === 'high' ? 'Alta' : 'Crítica'}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Alagamento na esquina, água pelo joelho..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="peopleCount">Número de pessoas</Label>
                <Input
                  id="peopleCount"
                  type="number"
                  min={1}
                  max={50}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="space-y-2">
                <Label>Nível de urgência</Label>
                <RadioGroup
                  value={urgencyLevel}
                  onValueChange={(v) => setUrgencyLevel(partialUrgency(v))}
                  className="space-y-2"
                >
                  {(Object.keys(URGENCY_META) as SurvivorUrgency[]).map((u) => (
                    <label
                      key={u}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        urgencyLevel === u
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem value={u} id={`urg-${u}`} />
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: URGENCY_META[u].color }}
                      />
                      <span className="text-sm">{URGENCY_META[u].label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                <input
                  type="checkbox"
                  id="anonymize"
                  checked={anonymize}
                  onChange={(e) => setAnonymize(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="anonymize" className="text-xs font-normal cursor-pointer">
                  Anonimizar minha localização (ofuscar por raio de 50-100m)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                🔒 Suas informações de contato serão criptografadas e nunca exibidas publicamente.
              </p>
            </>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || lat == null}>
            {submitting && <Loader2 size={16} className="animate-spin mr-1" />}
            {formType === 'incident' ? 'Enviar Reporte' : 'Sinalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function partialIncidentType(v: string): IncidentType {
  if (v === 'flood' || v === 'landslide' || v === 'safe_passage' || v === 'roadblock') return v
  return 'flood'
}
function partialSeverity(v: string): IncidentSeverity {
  if (v === 'low' || v === 'medium' || v === 'high' || v === 'critical') return v
  return 'medium'
}
function partialUrgency(v: string): SurvivorUrgency {
  if (v === 'safe_waiting' || v === 'need_medical' || v === 'need_evacuation' || v === 'critical') return v
  return 'safe_waiting'
}
