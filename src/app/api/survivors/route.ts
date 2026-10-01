import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/survivors - lista apenas sobreviventes não resolvidos
// Lembre-se: ao exibir, ofuscar localização se anonymize=true (client-side)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const onlyActive = url.searchParams.get('active') !== 'false'

    const where: Record<string, unknown> = {}
    if (onlyActive) {
      where.isResolved = false
      where.expiresAt = { gt: new Date() }
    }

    const survivors = await db.survivorSignal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({
      count: survivors.length,
      survivors: survivors.map((s) => ({
        ...s,
        // NUNCA retornar contactInfo para o cliente - proteção PII
        contactInfo: undefined,
        location: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      })),
    })
  } catch (err) {
    console.error('[api/survivors GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/survivors - cria sinal de socorro
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { peopleCount, urgencyLevel, longitude, latitude, anonymize } = body

    if (longitude == null || latitude == null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: longitude, latitude' },
        { status: 400 },
      )
    }

    const ttlMinutes = 24 * 60 // 24h padrão
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)

    const survivor = await db.survivorSignal.create({
      data: {
        peopleCount: Number(peopleCount) || 1,
        urgencyLevel: urgencyLevel || 'safe_waiting',
        longitude: Number(longitude),
        latitude: Number(latitude),
        anonymize: anonymize !== false, // default true
        expiresAt,
      },
    })

    // Não retornar contactInfo (mesmo se houvesse)
    return NextResponse.json({
      id: survivor.id,
      peopleCount: survivor.peopleCount,
      urgencyLevel: survivor.urgencyLevel,
      longitude: survivor.longitude,
      latitude: survivor.latitude,
      anonymize: survivor.anonymize,
      isResolved: survivor.isResolved,
      expiresAt: survivor.expiresAt,
      createdAt: survivor.createdAt,
    }, { status: 201 })
  } catch (err) {
    console.error('[api/survivors POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
