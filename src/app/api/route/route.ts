import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as turf from '@turf/turf'

// GET /api/route?from=lng,lat&to=lng,lat
// Calcula rota evitando incidentes ativos (flood, roadblock, landslide)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: from=lng,lat&to=lng,lat' },
        { status: 400 },
      )
    }

    const [fromLng, fromLat] = fromParam.split(',').map(Number)
    const [toLng, toLat] = toParam.split(',').map(Number)
    if ([fromLng, fromLat, toLng, toLat].some(Number.isNaN)) {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
    }

    // Buscar incidentes ativos do tipo "evitável"
    const avoidableTypes = ['flood', 'roadblock', 'landslide']
    const incidents = await db.incidentReport.findMany({
      where: {
        type: { in: avoidableTypes },
        expiresAt: { gt: new Date() },
      },
      take: 200,
    })

    const from = turf.point([fromLng, fromLat])
    const to = turf.point([toLng, toLat])

    // Distância direta (linha reta)
    const directDistance = turf.distance(from, to, { units: 'kilometers' })

    // Buffer de segurança ao redor de cada incidente (metros)
    // Converte severidade em raio
    const severityRadius: Record<string, number> = {
      low: 80,
      medium: 150,
      high: 300,
      critical: 500,
    }

    // Construir buffers (polígonos) a evitar
    const avoidancePolygons: turf.Feature<turf.Polygon>[] = []
    for (const inc of incidents) {
      const radius = severityRadius[inc.severity] ?? 150
      const buffer = turf.buffer(
        turf.point([inc.longitude, inc.latitude]),
        radius / 1000, // km
        { units: 'kilometers' },
      )
      if (buffer) avoidancePolygons.push(buffer as turf.Feature<turf.Polygon>)
    }

    // Heurística simples: se a linha reta não intercepta nenhum polígono, retornar como rota
    const directLine = turf.lineString([[fromLng, fromLat], [toLng, toLat]])
    let intersectsAvoidance = false
    const crossedIncidents: string[] = []

    for (let i = 0; i < avoidancePolygons.length; i++) {
      const poly = avoidancePolygons[i]
      const intersects = turf.booleanIntersects(directLine, poly)
      if (intersects) {
        intersectsAvoidance = true
        crossedIncidents.push(incidents[i].id)
      }
    }

    if (!intersectsAvoidance) {
      // Rota direta é segura
      return NextResponse.json({
        success: true,
        routeType: 'direct',
        distanceKm: Math.round(directDistance * 100) / 100,
        estimatedTimeMin: Math.round((directDistance / 30) * 60), // assume 30km/h urbano
        geometry: {
          type: 'LineString',
          coordinates: [[fromLng, fromLat], [toLng, toLat]],
        },
        avoidedIncidents: [],
        warnings: [],
      })
    }

    // Rota direta intercepta áreas de risco - calcular desvio
    // Estratégia: gerar waypoints tangentes aos buffers e construir rota alternativa
    const midPoint = turf.midpoint(from, to)
    const bearing = turf.bearing(from, to)

    // Tentar desvio à direita (+90°) e à esquerda (-90°)
    const detourDistance = Math.min(directDistance * 0.6, 5) // máximo 5km de desvio
    const detourKm = Math.max(0.3, detourDistance) // mínimo 300m

    const rightBearing = bearing + 90
    const leftBearing = bearing - 90

    const rightPoint = turf.destination(midPoint, detourKm, rightBearing, { units: 'kilometers' })
    const leftPoint = turf.destination(midPoint, detourKm, leftBearing, { units: 'kilometers' })

    // Testar ambos os desvios e escolher o que não intercepta (ou o menor)
    const rightLine = turf.lineString([
      [fromLng, fromLat],
      rightPoint.geometry.coordinates,
      [toLng, toLat],
    ])
    const leftLine = turf.lineString([
      [fromLng, fromLat],
      leftPoint.geometry.coordinates,
      [toLng, toLat],
    ])

    const rightClear = !avoidancePolygons.some((p) => turf.booleanIntersects(rightLine, p))
    const leftClear = !avoidancePolygons.some((p) => turf.booleanIntersects(leftLine, p))

    const rightDistance = turf.length(rightLine, { units: 'kilometers' })
    const leftDistance = turf.length(leftLine, { units: 'kilometers' })

    let chosenLine: turf.Feature<turf.LineString>
    let routeSide: 'right' | 'left'
    if (rightClear && (!leftClear || rightDistance <= leftDistance)) {
      chosenLine = rightLine
      routeSide = 'right'
    } else if (leftClear) {
      chosenLine = leftLine
      routeSide = 'left'
    } else {
      // Nenhum desvio simples funciona - usar o menor e alertar
      chosenLine = rightDistance <= leftDistance ? rightLine : leftLine
      routeSide = rightDistance <= leftDistance ? 'right' : 'left'
    }

    const routeDistance = turf.length(chosenLine, { units: 'kilometers' })

    // Identificar incidentes próximos à rota escolhida (dentro de 200m)
    const nearbyIncidents: { id: string; type: string; distanceM: number }[] = []
    for (const inc of incidents) {
      const pt = turf.point([inc.longitude, inc.latitude])
      const nearestPoint = turf.nearestPointOnLine(chosenLine, pt, { units: 'meters' })
      const d = nearestPoint.properties.dist as number
      if (d < 250) {
        nearbyIncidents.push({ id: inc.id, type: inc.type, distanceM: Math.round(d) })
      }
    }

    return NextResponse.json({
      success: true,
      routeType: 'detour',
      routeSide,
      distanceKm: Math.round(routeDistance * 100) / 100,
      estimatedTimeMin: Math.round((routeDistance / 30) * 60),
      geometry: {
        type: 'LineString',
        coordinates: chosenLine.geometry.coordinates,
      },
      avoidedIncidents: crossedIncidents,
      nearbyIncidents,
      warnings: nearbyIncidents.length > 0
        ? [`Atenção: ${nearbyIncidents.length} incidente(s) próximo(s) à rota escolhida.`]
        : ['Rota de desvio calculada para evitar áreas de risco.'],
    })
  } catch (err) {
    console.error('[api/route GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
