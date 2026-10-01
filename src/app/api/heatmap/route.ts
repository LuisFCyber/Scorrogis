import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/heatmap
// Query: ?bbox=west,south,east,north & category & urgency & periodHours & gridSize
// Retorna array de pontos [lng, lat, intensity] para o leaflet.heat
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const bbox = url.searchParams.get('bbox')
    const category = url.searchParams.get('category')
    const urgency = url.searchParams.get('urgency')
    const periodHours = parseInt(url.searchParams.get('periodHours') || '24')
    const gridSize = parseFloat(url.searchParams.get('gridSize') || '0.005')

    // Bounds default: 50km ao redor de Franca/SP
    let west = -47.6, south = -20.7, east = -47.2, north = -20.35
    if (bbox) {
      const parts = bbox.split(',').map(Number)
      if (parts.length === 4 && parts.every((v) => !Number.isNaN(v))) {
        ;[west, south, east, north] = parts
      }
    }

    // Busca todos os pedidos no bbox e período
    const since = new Date(Date.now() - periodHours * 60 * 60 * 1000)
    const where: Record<string, unknown> = {
      createdAt: { gt: since },
      AND: [
        { longitude: { gte: west } },
        { longitude: { lte: east } },
        { latitude: { gte: south } },
        { latitude: { lte: north } },
      ],
    }
    if (category) where.category = category
    if (urgency) where.urgency = urgency

    const requests = await db.helpRequest.findMany({
      where,
      select: {
        longitude: true,
        latitude: true,
        urgency: true,
        status: true,
        communityVerified: true,
      },
      take: 5000,
    })

    // Filtra apenas ativos (não resolvidos/cancelados)
    const active = requests.filter(
      (r) => r.status !== 'resolved' && r.status !== 'cancelled',
    )

    // Agrega em grid
    const cells = new Map<string, { count: number; sumWeight: number }>()
    const urgencyWeight: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    }
    // Bônus para pedidos validados pela comunidade
    const verifiedBonus = 0.5

    for (const r of active) {
      const cellLng = Math.floor(r.longitude / gridSize) * gridSize + gridSize / 2
      const cellLat = Math.floor(r.latitude / gridSize) * gridSize + gridSize / 2
      const key = `${cellLng.toFixed(5)}:${cellLat.toFixed(5)}`
      const weight = urgencyWeight[r.urgency] || 2 + (r.communityVerified ? verifiedBonus : 0)

      const existing = cells.get(key)
      if (existing) {
        existing.count += 1
        existing.sumWeight += weight
      } else {
        cells.set(key, { count: 1, sumWeight: weight })
      }
    }

    // Calcula intensidade máxima para normalização
    let maxIntensity = 0
    const points = Array.from(cells.entries()).map(([key, val]) => {
      const [lngStr, latStr] = key.split(':')
      const lng = parseFloat(lngStr)
      const lat = parseFloat(latStr)
      const intensity = val.sumWeight // soma de pesos = intensidade bruta
      if (intensity > maxIntensity) maxIntensity = intensity
      return {
        lng,
        lat,
        count: val.count,
        intensity, // bruto
      }
    })

    // Normaliza intensidade para 0-1 (para leaflet.heat)
    const normalized = points.map((p) => ({
      ...p,
      intensity: maxIntensity > 0 ? p.intensity / maxIntensity : 0,
    }))

    return NextResponse.json({
      count: normalized.length,
      totalRequests: active.length,
      maxIntensity,
      points: normalized,
      // Formato alternativo para leaflet.heat: [lat, lng, intensity]
      heatPoints: normalized.map((p) => [p.lat, p.lng, p.intensity]),
    })
  } catch (err) {
    console.error('[api/heatmap GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
