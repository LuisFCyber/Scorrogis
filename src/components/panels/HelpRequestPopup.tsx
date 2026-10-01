'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, BadgeCheck, AlertCircle, ThumbsUp, ThumbsDown, Loader2, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useMapStore } from '@/lib/store'
import type { HelpRequest, HelpCategory, HelpUrgency, VulnerableGroup } from '@/types/geo'
import {
  HELP_CATEGORY_META, HELP_URGENCY_META, HELP_STATUS_META, VULNERABLE_GROUP_LABELS,
} from '@/types/geo'

interface HelpRequestPopupProps {
  request: HelpRequest | null
  onClose: () => void
}

// Token anônimo do votante (gerado uma vez por navegador, guardado em localStorage)
function getVoterToken(): string {
  if (typeof window === 'undefined') return 'ssr'
  const key = 'voter-token'
  let t = localStorage.getItem(key)
  if (!t) {
    t = crypto.randomUUID()
    localStorage.setItem(key, t)
  }
  return t
}

// Verifica se já votou neste pedido (baseado em localStorage)
function hasVoted(requestId: string): boolean | null {
  if (typeof window === 'undefined') return null
  const votesStr = localStorage.getItem('help-votes') || '{}'
  try {
    const votes = JSON.parse(votesStr)
    return requestId in votes ? votes[requestId] : null
  } catch {
    return null
  }
}

function markVoted(requestId: string, vote: boolean) {
  if (typeof window === 'undefined') return
  const votesStr = localStorage.getItem('help-votes') || '{}'
  try {
    const votes = JSON.parse(votesStr)
    votes[requestId] = vote
    localStorage.setItem('help-votes', JSON.stringify(votes))
  } catch {
    /* ignore */
  }
}

export default function HelpRequestPopup({ request, onClose }: HelpRequestPopupProps) {
  const [submitting, setSubmitting] = useState(false)
  const [userVote, setUserVote] = useState<boolean | null>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState<string>('fake')
  const [reportComment, setReportComment] = useState('')
  // Estado local de contadores (atualizado após votar)
  const [localCounts, setLocalCounts] = useState<{ confirms: number; denies: number }>({
    confirms: 0,
    denies: 0,
  })
  const [localCommunityVerified, setLocalCommunityVerified] = useState(false)

  // Hooks do store para propagar atualizações a outros componentes
  const updateHelpRequest = useMapStore((s) => s.updateHelpRequest)

  useEffect(() => {
    if (request) {
      setUserVote(hasVoted(request.id))
      setReportReason('fake')
      setReportComment('')
      setShowReportDialog(false)
      setLocalCounts({
        confirms: request.validationCount,
        denies: request.denyCount,
      })
      setLocalCommunityVerified(request.communityVerified)
    }
  }, [request])

  if (!request) return null

  const catMeta = HELP_CATEGORY_META[request.category as HelpCategory]
  const urgMeta = HELP_URGENCY_META[request.urgency as HelpUrgency]
  const statusMeta = HELP_STATUS_META[request.status]

  const handleVote = async (vote: boolean) => {
    if (userVote !== null) {
      toast.info('Você já votou neste pedido.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/help-requests/${request.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote,
          voterToken: getVoterToken(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Limite de votos atingido', { description: data.error })
        } else if (res.status === 409) {
          toast.info('Você já votou neste pedido')
          setUserVote(data.existingVote)
          markVoted(request.id, data.existingVote)
        } else {
          toast.error('Erro ao validar', { description: data.error })
        }
        return
      }
      // Atualiza estado local imediatamente para feedback visual
      setLocalCounts({
        confirms: data.counts.confirms,
        denies: data.counts.denies,
      })
      setLocalCommunityVerified(data.communityVerified)
      setUserVote(vote)
      markVoted(request.id, vote)

      // Propaga para o store global (outros popups/markers ficam sincronizados)
      updateHelpRequest({
        ...request,
        validationCount: data.counts.confirms,
        denyCount: data.counts.denies,
        communityVerified: data.communityVerified,
        status: data.status || request.status,
      })

      toast.success(
        vote ? 'Pedido confirmado!' : 'Denúncia registrada',
        {
          description: `Confirmações: ${data.counts.confirms} • Denúncias: ${data.counts.denies}`,
        },
      )
    } catch (err) {
      toast.error('Erro de rede', {
        description: err instanceof Error ? err.message : 'Tente novamente',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReport = async () => {
    setSubmitting(true)
    try {
      // Por simplicidade, salvamos como uma validação negativa com comentário
      // Em produção, seria POST /api/moderation-reports
      await fetch(`/api/help-requests/${request.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote: false,
          comment: `[DENÚNCIA: ${reportReason}] ${reportComment}`,
          voterToken: getVoterToken(),
        }),
      })
      setShowReportDialog(false)
      toast.success('Denúncia enviada para moderação')
    } catch {
      toast.error('Erro ao enviar denúncia')
    } finally {
      setSubmitting(false)
    }
  }

  const isExpired = request.expiresAt && new Date(request.expiresAt).getTime() < Date.now()

  return (
    <>
      <div className="space-y-3 min-w-[280px] max-w-[320px]">
        {/* Header: categoria + urgência */}
        <div className="flex items-start gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: catMeta?.color }}
          >
            {catMeta?.label.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {catMeta?.label ?? 'Pedido'}
            </div>
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5"
                style={{ color: urgMeta?.color, borderColor: urgMeta?.color }}
              >
                {urgMeta?.label}
              </Badge>
              <Badge
                variant="secondary"
                className="text-[10px] py-0 px-1.5"
                style={{ color: statusMeta?.color }}
              >
                {statusMeta?.label}
              </Badge>
              {isExpired && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  Expirado
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Selos de verificação */}
        <div className="flex items-center gap-2 flex-wrap">
          {request.officialVerified ? (
            <Badge className="bg-green-600 hover:bg-green-600 text-[10px] py-0.5">
              <ShieldCheck size={11} className="mr-1" />
              Verificado oficial
            </Badge>
          ) : localCommunityVerified ? (
            <Badge className="bg-blue-500 hover:bg-blue-500 text-[10px] py-0.5">
              <BadgeCheck size={11} className="mr-1" />
              Validado pela comunidade
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0.5 text-muted-foreground">
              <AlertCircle size={11} className="mr-1" />
              Não verificado
            </Badge>
          )}
        </div>

        {/* Descrição */}
        {request.description && (
          <p className="text-xs text-foreground/90 leading-relaxed">
            {request.description}
          </p>
        )}

        {/* Detalhes */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pessoas:</span>
            <span className="font-medium">{request.peopleCount}</span>
          </div>
          {request.vulnerableGroups.length > 0 && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Vulneráveis:</span>
              <span className="font-medium text-right">
                {request.vulnerableGroups.map((g) => VULNERABLE_GROUP_LABELS[g]).join(', ')}
              </span>
            </div>
          )}
          {request.hasAnimals && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Animais:</span>
              <span className="font-medium text-right">
                {request.animalCount}
                {request.animalDescription ? ` (${request.animalDescription})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Validação */}
        <div className="flex items-center gap-3 text-xs pt-1 border-t border-border">
          <span className="text-muted-foreground">
            👍 {localCounts.confirms} confirmações
          </span>
          <span className="text-muted-foreground">
            👎 {localCounts.denies}
          </span>
        </div>

        {/* Ações */}
        {!isExpired && request.status !== 'resolved' && request.status !== 'cancelled' && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={userVote === true ? 'default' : 'outline'}
              disabled={submitting || userVote !== null}
              onClick={() => handleVote(true)}
              className="text-xs h-8"
            >
              {submitting ? <Loader2 size={12} className="animate-spin mr-1" /> : <ThumbsUp size={12} className="mr-1" />}
              Confirmo
            </Button>
            <Button
              size="sm"
              variant={userVote === false ? 'destructive' : 'outline'}
              disabled={submitting || userVote !== null}
              onClick={() => handleVote(false)}
              className="text-xs h-8"
            >
              {submitting ? <Loader2 size={12} className="animate-spin mr-1" /> : <ThumbsDown size={12} className="mr-1" />}
              Negar
            </Button>
          </div>
        )}

        {userVote !== null && (
          <div className="text-xs text-center text-muted-foreground">
            {userVote
              ? '✓ Você confirmou este pedido'
              : '✓ Você registrou denúncia'}
          </div>
        )}

        <button
          onClick={() => setShowReportDialog(true)}
          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
        >
          <Flag size={10} /> Denunciar
        </button>
      </div>

      {/* Dialog de denúncia */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Denunciar pedido</DialogTitle>
            <DialogDescription>
              Ajude a manter a plataforma livre de informações falsas ou impróprias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Motivo</label>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { value: 'fake', label: 'Informação falsa' },
                  { value: 'duplicate', label: 'Duplicado' },
                  { value: 'outdated', label: 'Já resolvido / desatualizado' },
                  { value: 'offensive', label: 'Conteúdo ofensivo' },
                  { value: 'other', label: 'Outro' },
                ].map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs ${
                      reportReason === r.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reportReason === r.value}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-3 h-3"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <Textarea
              placeholder="Comentário (opcional)"
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleReport} disabled={submitting}>
              {submitting && <Loader2 size={12} className="animate-spin mr-1" />}
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
