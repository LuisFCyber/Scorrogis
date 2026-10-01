import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/incidents - lista incidentes (opcionalmente filtrados por bbox)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const bbox = url.searchParams.get('bbox') // "west,south,east,north"
    const type = url.searchParams.get('type')
    const onlyActive = url.searchParams.get('active') !== 'false'

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (onlyActive) where.expiresAt = { gt: new Date() }

    const incidents = await db.incidentReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    let result = incidents
    if (bbox) {
      const [west, south, east, north] = bbox.split(',').map(Number)
      if ([west, south, east, north].every((v) => !Number.isNaN(v))) {
        result = incidents.filter(
          (i) =>
            i.longitude >= west && i.longitude <= east &&
            i.latitude >= south && i.latitude <= north,
        )
      }
    }

    return NextResponse.json({
      count: result.length,
      incidents: result.map((i) => ({
        ...i,
        location: { type: 'Point', coordinates: [i.longitude, i.latitude] },
      })),
    })
  } catch (err) {
    console.error('[api/incidents GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/incidents - cria novo incidente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, severity, longitude, latitude, description, ttlMinutes } = body

    if (!type || longitude == null || latitude == null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: type, longitude, latitude' },
        { status: 400 },
      )
    }

    const validTypes = ['flood', 'landslide', 'safe_passage', 'roadblock']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type inválido: ${type}` }, { status: 400 })
    }

    // TTL padrão por tipo (em minutos) - replica a lógica PostGIS
    const defaultTtl: Record<string, number> = {
      flood: 6 * 60,
      landslide: 12 * 60,
      roadblock: 4 * 60,
      safe_passage: 2 * 60,
    }
    const ttl = ttlMinutes ?? defaultTtl[type] ?? 24 * 60

    const expiresAt = new Date(Date.now() + ttl * 60_000)

    const incident = await db.incidentReport.create({
      data: {
        type,
        severity: severity || 'medium',
        longitude: Number(longitude),
        latitude: Number(latitude),
        description: description || null,
        expiresAt,
      },
    })

    return NextResponse.json({
      ...incident,
      location: { type: 'Point', coordinates: [incident.longitude, incident.latitude] },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/incidents POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
