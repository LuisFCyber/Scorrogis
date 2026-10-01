import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { HelpStatus, HelpCategory, HelpUrgency, VulnerableGroup } from '@/types/geo'

// GET /api/help-requests/[id] - detalhes de um pedido
// Query: ?authorToken=xxx (para ver contato se for o autor)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const url = req.nextUrl
    const authorToken = url.searchParams.get('authorToken')

    const request = await db.helpRequest.findUnique({ where: { id } })
    if (!request) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Se for o autor (token correto), retorna contato
    const isAuthor = authorToken && request.authorToken && authorToken === request.authorToken

    let contact: { phone?: string; whatsapp?: string; name?: string } | null = null
    if (isAuthor && request.contact) {
      try {
        contact = JSON.parse(request.contact)
      } catch {
        contact = null
      }
    }

    let vulnerableGroups: VulnerableGroup[] = []
    if (request.vulnerableGroups) {
      try {
        vulnerableGroups = JSON.parse(request.vulnerableGroups)
      } catch {
        vulnerableGroups = []
      }
    }

    let photos: string[] = []
    if (request.photos) {
      try {
        photos = JSON.parse(request.photos)
      } catch {
        photos = []
      }
    }

    return NextResponse.json({
      id: request.id,
      category: request.category as HelpCategory,
      urgency: request.urgency as HelpUrgency,
      status: request.status as HelpStatus,
      longitude: request.longitude,
      latitude: request.latitude,
      description: request.description,
      peopleCount: request.peopleCount,
      vulnerableGroups,
      hasAnimals: request.hasAnimals,
      animalCount: request.animalCount,
      animalDescription: request.animalDescription,
      contact,
      photos,
      validationCount: request.validationCount,
      denyCount: request.denyCount,
      communityVerified: request.communityVerified,
      officialVerified: request.officialVerified,
      isAuthor: Boolean(isAuthor),
      expiresAt: request.expiresAt ? request.expiresAt.toISOString() : null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      location: {
        type: 'Point',
        coordinates: [request.longitude, request.latitude],
      },
    })
  } catch (err) {
    console.error('[api/help-requests/[id] GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/help-requests/[id] - editar pedido (apenas autor com token)
// Body: { authorToken, status?, ...camposParaAtualizar }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { authorToken, status, description, peopleCount, hasAnimals, animalCount, animalDescription } = body

    if (!authorToken) {
      return NextResponse.json({ error: 'authorToken obrigatório' }, { status: 401 })
    }

    const request = await db.helpRequest.findUnique({ where: { id } })
    if (!request) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (request.authorToken !== authorToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    }

    // Não permite mudar para status inválido
    const validStatuses: HelpStatus[] = [
      'pending', 'analyzing', 'validated', 'in_progress', 'resolved', 'cancelled',
    ]

    const data: Record<string, unknown> = {}
    if (status && validStatuses.includes(status)) data.status = status
    if (description !== undefined) data.description = description || null
    if (peopleCount !== undefined) data.peopleCount = Math.max(1, Number(peopleCount) || 1)
    if (hasAnimals !== undefined) data.hasAnimals = Boolean(hasAnimals)
    if (animalCount !== undefined) data.animalCount = Math.max(0, Number(animalCount) || 0)
    if (animalDescription !== undefined) data.animalDescription = animalDescription || null

    const updated = await db.helpRequest.update({ where: { id }, data })

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      description: updated.description,
      peopleCount: updated.peopleCount,
      hasAnimals: updated.hasAnimals,
      animalCount: updated.animalCount,
      animalDescription: updated.animalDescription,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[api/help-requests/[id] PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
