import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/shelters
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const type = url.searchParams.get('type')
    const onlyActive = url.searchParams.get('active') !== 'false'

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (onlyActive) where.isActive = true

    const shelters = await db.shelter.findMany({ where, take: 500 })

    return NextResponse.json({
      count: shelters.length,
      shelters: shelters.map((s) => ({
        ...s,
        contactInfo: s.contactInfo ? JSON.parse(s.contactInfo) : null,
        suppliesNeeded: s.suppliesNeeded ? JSON.parse(s.suppliesNeeded) : [],
        location: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      })),
    })
  } catch (err) {
    console.error('[api/shelters GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/shelters
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, type, longitude, latitude, capacityTotal, capacityUsed, capacityStatus, contactInfo, suppliesNeeded, notes } = body

    if (!name || longitude == null || latitude == null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, longitude, latitude' },
        { status: 400 },
      )
    }

    const shelter = await db.shelter.create({
      data: {
        name,
        type: type || 'shelter',
        longitude: Number(longitude),
        latitude: Number(latitude),
        capacityTotal: Number(capacityTotal) || 0,
        capacityUsed: Number(capacityUsed) || 0,
        capacityStatus: capacityStatus || 'unknown',
        contactInfo: contactInfo ? JSON.stringify(contactInfo) : null,
        suppliesNeeded: suppliesNeeded ? JSON.stringify(suppliesNeeded) : null,
        notes: notes || null,
      },
    })

    return NextResponse.json({
      ...shelter,
      contactInfo: shelter.contactInfo ? JSON.parse(shelter.contactInfo) : null,
      suppliesNeeded: shelter.suppliesNeeded ? JSON.parse(shelter.suppliesNeeded) : [],
      location: { type: 'Point', coordinates: [shelter.longitude, shelter.latitude] },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/shelters POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
