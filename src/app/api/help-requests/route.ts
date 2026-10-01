import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { HelpRequest, HelpCategory, HelpUrgency, VulnerableGroup } from '@/types/geo'

// GET /api/help-requests
// Query params: ?bbox=west,south,east,north & category & urgency & status
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const bbox = url.searchParams.get('bbox')
    const category = url.searchParams.get('category')
    const urgency = url.searchParams.get('urgency')
    const status = url.searchParams.get('status')
    const onlyActive = url.searchParams.get('active') !== 'false'

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (urgency) where.urgency = urgency
    if (status) where.status = status
    if (onlyActive) where.expiresAt = { gt: new Date() }

    const requests = await db.helpRequest.findMany({
      where,
      orderBy: [
        // crítico primeiro
        { urgency: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 500,
    })

    let result = requests
    if (bbox) {
      const [west, south, east, north] = bbox.split(',').map(Number)
      if ([west, south, east, north].every((v) => !Number.isNaN(v))) {
        result = requests.filter(
          (r) =>
            r.longitude >= west && r.longitude <= east &&
            r.latitude >= south && r.latitude <= north,
        )
      }
    }

    return NextResponse.json({
      count: result.length,
      helpRequests: result.map((r) => serializeHelpRequest(r as unknown as HelpRequestRow)),
    })
  } catch (err) {
    console.error('[api/help-requests GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/help-requests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      category, urgency, longitude, latitude, description,
      peopleCount, vulnerableGroups, hasAnimals, animalCount,
      animalDescription, contact, photos,
    } = body

    if (longitude == null || latitude == null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: longitude, latitude' },
        { status: 400 },
      )
    }

    const validCategories: HelpCategory[] = ['rescue', 'supplies', 'medical', 'shelter', 'transport']
    const validUrgencies: HelpUrgency[] = ['low', 'medium', 'high', 'critical']
    const validVulnerable: VulnerableGroup[] = ['criancas', 'idosos', 'gestantes', 'pcd', 'outros']

    const finalCategory = validCategories.includes(category) ? category : 'rescue'
    const finalUrgency = validUrgencies.includes(urgency) ? urgency : 'medium'

    // Sanitiza grupos vulneráveis
    const sanitizedVulnerable = Array.isArray(vulnerableGroups)
      ? vulnerableGroups.filter((v: string): v is VulnerableGroup =>
          validVulnerable.includes(v as VulnerableGroup),
        )
      : []

    // TTL: pedidos críticos expiram em 24h, demais em 72h
    const ttlHours = finalUrgency === 'critical' ? 24 : 72
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

    // Token anônimo do autor (permite edição sem login)
    const authorToken = randomUUID()

    const created = await db.helpRequest.create({
      data: {
        category: finalCategory,
        urgency: finalUrgency,
        status: 'pending',
        longitude: Number(longitude),
        latitude: Number(latitude),
        description: description || null,
        peopleCount: Math.max(1, Number(peopleCount) || 1),
        vulnerableGroups: JSON.stringify(sanitizedVulnerable),
        hasAnimals: Boolean(hasAnimals),
        animalCount: Math.max(0, Number(animalCount) || 0),
        animalDescription: animalDescription || null,
        contact: contact ? JSON.stringify(contact) : null,
        photos: photos ? JSON.stringify(photos) : null,
        authorToken,
        expiresAt,
      },
    })

    const serialized = serializeHelpRequest(created as unknown as HelpRequestRow)
    return NextResponse.json({ ...serialized, authorToken }, { status: 201 })
  } catch (err) {
    console.error('[api/help-requests POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Tipo interno (linha do banco, antes de serializar)
interface HelpRequestRow {
  id: string
  category: string
  urgency: string
  status: string
  longitude: number
  latitude: number
  description: string | null
  peopleCount: number
  vulnerableGroups: string | null
  hasAnimals: boolean
  animalCount: number
  animalDescription: string | null
  contact: string | null
  photos: string | null
  validationCount: number
  denyCount: number
  communityVerified: boolean
  officialVerified: boolean
  authorToken: string | null
  expiresAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

// Serializa linha do banco → DTO público (sem PII de contato, parse JSON)
function serializeHelpRequest(r: HelpRequestRow): Omit<HelpRequest, 'authorToken'> {
  let parsedContact: HelpRequest['contact'] = null
  if (r.contact) {
    try {
      // PII: NÃO expor contato em listagens públicas. Apenas em detalhes do próprio autor.
      parsedContact = null
    } catch {
      parsedContact = null
    }
  }

  let parsedPhotos: string[] = []
  if (r.photos) {
    try {
      parsedPhotos = JSON.parse(r.photos)
    } catch {
      parsedPhotos = []
    }
  }

  let parsedVulnerable: VulnerableGroup[] = []
  if (r.vulnerableGroups) {
    try {
      parsedVulnerable = JSON.parse(r.vulnerableGroups)
    } catch {
      parsedVulnerable = []
    }
  }

  return {
    id: r.id,
    category: r.category as HelpCategory,
    urgency: r.urgency as HelpUrgency,
    status: r.status as HelpRequest['status'],
    longitude: r.longitude,
    latitude: r.latitude,
    description: r.description,
    peopleCount: r.peopleCount,
    vulnerableGroups: parsedVulnerable,
    hasAnimals: r.hasAnimals,
    animalCount: r.animalCount,
    animalDescription: r.animalDescription,
    contact: parsedContact,
    photos: parsedPhotos,
    validationCount: r.validationCount,
    denyCount: r.denyCount,
    communityVerified: r.communityVerified,
    officialVerified: r.officialVerified,
    authorToken: null, // nunca expor em listagens
    expiresAt: r.expiresAt ? new Date(r.expiresAt as string).toISOString() : null,
    createdAt: new Date(r.createdAt as string).toISOString(),
    updatedAt: new Date(r.updatedAt as string).toISOString(),
    location: {
      type: 'Point',
      coordinates: [r.longitude, r.latitude],
    },
  } as Omit<HelpRequest, 'authorToken'>
}
