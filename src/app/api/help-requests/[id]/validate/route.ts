import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// POST /api/help-requests/[id]/validate
// Body: { vote: boolean, comment?: string, voterToken?: string }
// - vote=true = confirmo que o pedido é real
// - vote=false = denúncia (fake/atendido/ofensivo)
// Rate limit: 1 voto por (voterToken + IP) por pedido, máx 10 votos por IP por hora
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const vote: boolean = Boolean(body?.vote)
    const comment: string | null = body?.comment ? String(body.comment).slice(0, 500) : null

    // Gera ou recebe voterToken (anônimo, armazenado em localStorage)
    let voterToken: string = body?.voterToken
    if (!voterToken || typeof voterToken !== 'string' || voterToken.length > 100) {
      return NextResponse.json(
        { error: 'voterToken obrigatório (gere um UUID no client e armazene em localStorage)' },
        { status: 400 },
      )
    }

    // Hash do IP para rate-limit (não guardamos IP original)
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32)

    // Verifica se pedido existe
    const request = await db.helpRequest.findUnique({ where: { id } })
    if (!request) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Rate limit por IP: máx 10 votos por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentVotesByIp = await db.helpRequestValidation.count({
      where: { ipHash, createdAt: { gt: oneHourAgo } },
    })
    if (recentVotesByIp >= 10) {
      return NextResponse.json(
        { error: 'Limite de 10 votos por hora atingido. Tente novamente mais tarde.' },
        { status: 429 },
      )
    }

    // Verifica se já votou (unique constraint em requestId + voterToken)
    const existing = await db.helpRequestValidation.findUnique({
      where: { requestId_voterToken: { requestId: id, voterToken } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Você já votou neste pedido', existingVote: existing.vote },
        { status: 409 },
      )
    }

    // Cria o voto
    const validation = await db.helpRequestValidation.create({
      data: {
        requestId: id,
        vote,
        comment,
        ipHash,
        voterToken,
      },
    })

    // Atualiza contadores no pedido
    const confirms = await db.helpRequestValidation.count({
      where: { requestId: id, vote: true },
    })
    const denies = await db.helpRequestValidation.count({
      where: { requestId: id, vote: false },
    })

    // Auto-verifica comunidade: >= 3 confirmações e denies < confirms/2
    const communityVerified = confirms >= 3 && denies < confirms / 2

    const updated = await db.helpRequest.update({
      where: { id },
      data: {
        validationCount: confirms,
        denyCount: denies,
        communityVerified,
        // Se foi validado pela comunidade e estava pending, muda para validated
        status: communityVerified && request.status === 'pending' ? 'validated' : request.status,
      },
    })

    return NextResponse.json({
      success: true,
      validationId: validation.id,
      vote: validation.vote,
      counts: {
        confirms,
        denies,
      },
      communityVerified: updated.communityVerified,
      status: updated.status,
    })
  } catch (err) {
    console.error('[api/help-requests/validate POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
