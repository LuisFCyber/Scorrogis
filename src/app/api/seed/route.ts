import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/seed - popula o banco com dados de exemplo (centro de SP)
export async function POST() {
  try {
    // Limpar dados existentes
    await db.routeValidation.deleteMany()
    await db.incidentReport.deleteMany()
    await db.shelter.deleteMany()
    await db.survivorSignal.deleteMany()

    const now = Date.now()
    const hour = 60 * 60 * 1000

    // Incidentes (alagamentos, bloqueios, rotas seguras)
    const incidents = await Promise.all([
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'high',
          longitude: -46.6333, latitude: -23.5505, // Praça da Sé
          description: 'Alagamento na região central, nível alto.',
          upvotes: 8, downvotes: 1, verified: true,
          expiresAt: new Date(now + 4 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'medium',
          longitude: -46.6543, latitude: -23.5613, // Av. Paulista
          description: 'Ponto de alagamento na Paulista, trânsito lento.',
          upvotes: 4, downvotes: 0, verified: false,
          expiresAt: new Date(now + 3 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'roadblock',
          severity: 'critical',
          longitude: -46.6411, latitude: -23.5489, // Av. 23 de Maio
          description: 'Via interditada - árvore caída e alagamento.',
          upvotes: 12, downvotes: 0, verified: true,
          expiresAt: new Date(now + 2 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'safe_passage',
          severity: 'low',
          longitude: -46.6488, latitude: -23.5587,
          description: 'Rota alternativa liberada - via Consolação.',
          upvotes: 6, downvotes: 1, verified: true,
          expiresAt: new Date(now + 1 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'landslide',
          severity: 'critical',
          longitude: -46.6058, latitude: -23.5325,
          description: 'Deslizamento na região leste, evitar aproximação.',
          upvotes: 15, downvotes: 0, verified: true,
          expiresAt: new Date(now + 8 * hour),
        },
      }),
    ])

    // Abrigos
    const shelters = await Promise.all([
      db.shelter.create({
        data: {
          name: 'Ginásio Esportivo Central',
          type: 'shelter',
          longitude: -46.6365, latitude: -23.5475,
          capacityTotal: 500, capacityUsed: 187,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 11 3000-0000', whatsapp: '+55 11 99999-0000' }),
          suppliesNeeded: JSON.stringify(['água potável', 'colchões', 'roupas de cama']),
          notes: 'Acessível a cadeirantes. Aceita animais de estimação.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'Hospital Municipal Dr. Arthur Ribeiro Saboya',
          type: 'hospital',
          longitude: -46.6223, latitude: -23.5541,
          capacityTotal: 120, capacityUsed: 95,
          capacityStatus: 'limited',
          contactInfo: JSON.stringify({ phone: '+55 11 3000-1111' }),
          suppliesNeeded: JSON.stringify(['medicamentos', 'soros']),
          notes: 'Atendimento de emergência 24h.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'Posto de Distribuição de Alimentos - CEAGESP',
          type: 'food_distribution',
          longitude: -46.6958, latitude: -23.5270,
          capacityTotal: 0, capacityUsed: 0,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 11 3000-2222' }),
          suppliesNeeded: JSON.stringify([]),
          notes: 'Distribuição de cestas básicas e água diariamente às 9h.',
        },
      }),
    ])

    // Sinais de sobreviventes
    const survivors = await Promise.all([
      db.survivorSignal.create({
        data: {
          peopleCount: 4,
          urgencyLevel: 'need_evacuation',
          longitude: -46.6397, latitude: -23.5520,
          anonymize: true,
          expiresAt: new Date(now + 20 * hour),
        },
      }),
      db.survivorSignal.create({
        data: {
          peopleCount: 2,
          urgencyLevel: 'safe_waiting',
          longitude: -46.6440, latitude: -23.5580,
          anonymize: true,
          expiresAt: new Date(now + 10 * hour),
        },
      }),
    ])

    return NextResponse.json({
      seeded: true,
      counts: {
        incidents: incidents.length,
        shelters: shelters.length,
        survivors: survivors.length,
      },
    })
  } catch (err) {
    console.error('[api/seed]', err)
    return NextResponse.json({ error: 'Erro ao semear banco' }, { status: 500 })
  }
}
