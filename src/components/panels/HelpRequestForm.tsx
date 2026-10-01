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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertTriangle, LifeBuoy, HeartPulse, Home, Truck, Package, Camera, X } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { useRealtime } from '@/lib/realtime/useRealtime'
import {
  HELP_CATEGORY_META,
  HELP_URGENCY_META,
  VULNERABLE_GROUP_LABELS,
} from '@/types/geo'
import type {
  HelpCategory, HelpUrgency, VulnerableGroup, HelpRequest,
} from '@/types/geo'

interface HelpRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lat: number | null
  lng: number | null
}

const CATEGORIES: HelpCategory[] = ['rescue', 'supplies', 'medical', 'shelter', 'transport']
const URGENCIES: HelpUrgency[] = ['low', 'medium', 'high', 'critical']
const VULNERABLE_GROUPS: VulnerableGroup[] = ['criancas', 'idosos', 'gestantes', 'pcd', 'outros']

export default function HelpRequestForm({ open, onOpenChange, lat, lng }: HelpRequestFormProps) {
  const setCreationMode = useMapStore((s) => s.setCreationMode)
  const addHelpRequest = useMapStore((s) => s.addHelpRequest)
  const realtime = useRealtime()

  const [category, setCategory] = useState<HelpCategory>('rescue')
  const [urgency, setUrgency] = useState<HelpUrgency>('high')
  const [description, setDescription] = useState('')
  const [peopleCount, setPeopleCount] = useState(1)
  const [vulnerableGroups, setVulnerableGroups] = useState<VulnerableGroup[]>([])
  const [hasAnimals, setHasAnimals] = useState(false)
  const [animalCount, setAnimalCount] = useState(0)
  const [animalDescription, setAnimalDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [consent, setConsent] = useState(false)
  const [approximateLocation, setApproximateLocation] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorToken, setAuthorToken] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setDescription('')
      setPeopleCount(1)
      setVulnerableGroups([])
      setHasAnimals(false)
      setAnimalCount(0)
      setAnimalDescription('')
      setContactName('')
      setContactPhone('')
      setContactWhatsapp('')
      setConsent(false)
      setApproximateLocation(true)
      setCategory('rescue')
      setUrgency('high')
      setAuthorToken(null)
      setCreatedId(null)
    }
  }, [open])

  const toggleVulnerable = (g: VulnerableGroup) => {
    setVulnerableGroups((curr) =>
      curr.includes(g) ? curr.filter((x) => x !== g) : [...curr, g],
    )
  }

  const handleSubmit = async () => {
    if (lat == null || lng == null) {
      setError('Coordenadas inválidas. Clique no mapa novamente.')
      return
    }
    if (!consent) {
      setError('Você precisa consentir com o tratamento dos dados (LGPD).')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      // Ofusca localização se solicitado (raio 50-100m)
      let finalLng = lng
      let finalLat = lat
      if (approximateLocation) {
        const offsetLng = (Math.random() - 0.5) * 0.001 // ~50m
        const offsetLat = (Math.random() - 0.5) * 0.001
        finalLng = lng + offsetLng
        finalLat = lat + offsetLat
      }

      const res = await fetch('/api/help-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          urgency,
          longitude: finalLng,
          latitude: finalLat,
          description,
          peopleCount,
          vulnerableGroups,
          hasAnimals,
          animalCount,
          animalDescription,
          contact: contactPhone || contactWhatsapp || contactName
            ? { name: contactName || undefined, phone: contactPhone || undefined, whatsapp: contactWhatsapp || undefined }
            : null,
        }),
      })
      if (!res.ok) throw new Error('Falha ao criar pedido de ajuda')
      const created: HelpRequest & { authorToken: string } = await res.json()

      addHelpRequest(created)
      realtime.emitHelpRequestCreate(created)
      setAuthorToken(created.authorToken)
      setCreatedId(created.id)

      // Persiste token no localStorage para edição posterior
      if (typeof window !== 'undefined') {
        const tokensStr = localStorage.getItem('help-request-tokens') || '{}'
        const tokens = JSON.parse(tokensStr)
        tokens[created.id] = created.authorToken
        localStorage.setItem('help-request-tokens', JSON.stringify(tokens))
      }
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

  const handleDone = () => {
    setCreationMode({ kind: 'none' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy size={18} className="text-destructive" />
            Pedido de Ajuda
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo. Quanto mais detalhes, mais rápida será a resposta.
          </DialogDescription>
        </DialogHeader>

        {createdId ? (
          <div className="space-y-3 py-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 text-sm">
              <div className="font-semibold text-green-800 dark:text-green-400 mb-1">
                ✓ Pedido criado com sucesso!
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                ID: <code className="font-mono">{createdId}</code>
              </div>
              <div className="text-xs">
                Guarde este ID para acompanhar/editar seu pedido.
                O token de edição foi salvo automaticamente neste navegador.
              </div>
            </div>
            <Button onClick={handleDone} className="w-full">Concluir</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Localização */}
            <div className="bg-muted/50 rounded-md p-2 text-xs">
              📍 Localização: {lat != null && lng != null
                ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                : 'Não definida'}
              {approximateLocation && ' (ofuscada ~50m)'}
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((c) => {
                  const meta = HELP_CATEGORY_META[c]
                  const Icon = iconForCategory(c)
                  const active = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <Icon size={18} style={{ color: active ? meta.color : undefined }} />
                      <span>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Urgência */}
            <div className="space-y-2">
              <Label>Nível de urgência *</Label>
              <RadioGroup
                value={urgency}
                onValueChange={(v) => setUrgency(v as HelpUrgency)}
                className="grid grid-cols-4 gap-2"
              >
                {URGENCIES.map((u) => {
                  const meta = HELP_URGENCY_META[u]
                  const active = urgency === u
                  return (
                    <label
                      key={u}
                      className={`text-center p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                        active ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted'
                      }`}
                      style={active ? { borderColor: meta.color, color: meta.color } : undefined}
                    >
                      <RadioGroupItem value={u} className="sr-only" />
                      {meta.label}
                    </label>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Pessoas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="peopleCount">Nº de pessoas</Label>
                <Input
                  id="peopleCount"
                  type="number"
                  min={1}
                  max={100}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Vulneráveis */}
            <div className="space-y-2">
              <Label>Grupos vulneráveis no local</Label>
              <div className="grid grid-cols-2 gap-2">
                {VULNERABLE_GROUPS.map((g) => (
                  <label
                    key={g}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                      vulnerableGroups.includes(g)
                        ? 'bg-primary/10 border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={vulnerableGroups.includes(g)}
                      onCheckedChange={() => toggleVulnerable(g)}
                    />
                    {VULNERABLE_GROUP_LABELS[g]}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Animais */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasAnimals"
                  checked={hasAnimals}
                  onCheckedChange={(v) => {
                    setHasAnimals(v === true)
                    if (!v) {
                      setAnimalCount(0)
                      setAnimalDescription('')
                    }
                  }}
                />
                <Label htmlFor="hasAnimals" className="cursor-pointer">Há animais no local?</Label>
              </div>
              {hasAnimals && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <Label htmlFor="animalCount" className="text-xs">Quantidade</Label>
                    <Input
                      id="animalCount"
                      type="number"
                      min={1}
                      value={animalCount}
                      onChange={(e) => setAnimalCount(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="animalDescription" className="text-xs">Descrição (opcional)</Label>
                    <Input
                      id="animalDescription"
                      placeholder="Ex: 2 cachorros pequenos"
                      value={animalDescription}
                      onChange={(e) => setAnimalDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição da situação</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Estamos ilhados no segundo andar, água subiu rápido..."
                rows={3}
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {description.length}/1000
              </div>
            </div>

            <Separator />

            {/* Contato (opcional) */}
            <div className="space-y-2">
              <Label>Contato (opcional, mas recomendado)</Label>
              <p className="text-xs text-muted-foreground">
                🔒 Será criptografado e NUNCA exibido publicamente. Apenas usado pela equipe de resgate.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nome"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Input
                  placeholder="Telefone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <Input
                placeholder="WhatsApp (com DDD)"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
              />
            </div>

            <Separator />

            {/* LGPD / Privacidade */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md cursor-pointer">
                <Checkbox
                  checked={approximateLocation}
                  onCheckedChange={(v) => setApproximateLocation(v === true)}
                />
                <span className="text-xs">
                  <strong>Ofuscar minha localização exata</strong> (adicionar ruído de ~50m)
                  <br />
                  <span className="text-muted-foreground">Recomendado para proteger identidade.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md cursor-pointer">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <span className="text-xs">
                  <strong>Consentimento LGPD *</strong> — autorizo o tratamento dos meus dados
                  para fins exclusivos de resposta a emergência, conforme a Lei nº 13.709/2018.
                  Posso solicitar a exclusão a qualquer momento.
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {!createdId && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !consent}>
              {submitting && <Loader2 size={16} className="animate-spin mr-1" />}
              Enviar Pedido
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function iconForCategory(c: HelpCategory) {
  switch (c) {
    case 'rescue': return LifeBuoy
    case 'supplies': return Package
    case 'medical': return HeartPulse
    case 'shelter': return Home
    case 'transport': return Truck
  }
}
