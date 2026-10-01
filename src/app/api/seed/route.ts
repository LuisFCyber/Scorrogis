import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/seed - popula o banco com dados de exemplo (Franca/SP)
// Coordenadas de referência: -20.5389, -47.4008 (centro de Franca)
export async function POST() {
  try {
    await db.routeValidation.deleteMany()
    await db.incidentReport.deleteMany()
    await db.shelter.deleteMany()
    await db.survivorSignal.deleteMany()
    await db.helpRequestValidation.deleteMany()
    await db.helpRequest.deleteMany()
    await db.moderationReport.deleteMany()

    const now = Date.now()
    const hour = 60 * 60 * 1000

    // Incidentes (alagamentos, bloqueios, rotas seguras) em Franca/SP
    const incidents = await Promise.all([
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'high',
          longitude: -47.4008, latitude: -20.5389, // Centro (Praça Municipal Dr. Enéas de Oliveira)
          description: 'Alagamento na região central, nível alto.',
          upvotes: 8, downvotes: 1, verified: true,
          expiresAt: new Date(now + 4 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'medium',
          longitude: -47.4013, latitude: -20.5290, // Av. Champagnat
          description: 'Ponto de alagamento na Champagnat, trânsito lento.',
          upvotes: 4, downvotes: 0, verified: false,
          expiresAt: new Date(now + 3 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'roadblock',
          severity: 'critical',
          longitude: -47.3988, latitude: -20.5335, // Av. Rio Branco
          description: 'Via interditada - árvore caída e alagamento.',
          upvotes: 12, downvotes: 0, verified: true,
          expiresAt: new Date(now + 2 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'safe_passage',
          severity: 'low',
          longitude: -47.4108, latitude: -20.5320, // Av. Dr. Júlio Cardoso
          description: 'Rota alternativa liberada - via Júlio Cardoso.',
          upvotes: 6, downvotes: 1, verified: true,
          expiresAt: new Date(now + 1 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'landslide',
          severity: 'critical',
          longitude: -47.4358, latitude: -20.5650, // Região do Quintassol / alta encosta
          description: 'Deslizamento na região leste, evitar aproximação.',
          upvotes: 15, downvotes: 0, verified: true,
          expiresAt: new Date(now + 8 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'medium',
          longitude: -47.3885, latitude: -20.5477, // Córrego São José
          description: 'Córrego transbordando, isolar área.',
          upvotes: 7, downvotes: 0, verified: true,
          expiresAt: new Date(now + 5 * hour),
        },
      }),
    ])

    // Abrigos em Franca/SP
    const shelters = await Promise.all([
      db.shelter.create({
        data: {
          name: 'Ginásio Municipal Paulo Cyrne de Oliveira',
          type: 'shelter',
          longitude: -47.4130, latitude: -20.5358,
          capacityTotal: 800, capacityUsed: 312,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 16 3721-2000', whatsapp: '+55 16 99999-0001' }),
          suppliesNeeded: JSON.stringify(['água potável', 'colchões', 'roupas de cama', 'fraldas']),
          notes: 'Acessível a cadeirantes. Aceita animais de estimação pequenos.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'Hospital Regional de Franca',
          type: 'hospital',
          longitude: -47.4221, latitude: -20.5441,
          capacityTotal: 200, capacityUsed: 158,
          capacityStatus: 'limited',
          contactInfo: JSON.stringify({ phone: '+55 16 3722-5000' }),
          suppliesNeeded: JSON.stringify(['medicamentos', 'soros', 'soro fisiológico']),
          notes: 'Atendimento de emergência 24h. Pronto-socorro ativo.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'CEAGESP Franca - Posto de Distribuição',
          type: 'food_distribution',
          longitude: -47.3958, latitude: -20.5270,
          capacityTotal: 0, capacityUsed: 0,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 16 3723-1111' }),
          suppliesNeeded: JSON.stringify([]),
          notes: 'Distribuição de cestas básicas e água diariamente às 9h e 15h.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'UBS Estiva (Posto de Saúde)',
          type: 'hospital',
          longitude: -47.4485, latitude: -20.5800,
          capacityTotal: 50, capacityUsed: 23,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 16 3723-2222' }),
          suppliesNeeded: JSON.stringify(['medicamentos básicos']),
          notes: 'Posto de saúde comunitário.',
        },
      }),
    ])

    // Sinais de sobreviventes
    const survivors = await Promise.all([
      db.survivorSignal.create({
        data: {
          peopleCount: 4,
          urgencyLevel: 'need_evacuation',
          longitude: -47.4015, latitude: -20.5410,
          anonymize: true,
          expiresAt: new Date(now + 20 * hour),
        },
      }),
      db.survivorSignal.create({
        data: {
          peopleCount: 2,
          urgencyLevel: 'safe_waiting',
          longitude: -47.4060, latitude: -20.5480,
          anonymize: true,
          expiresAt: new Date(now + 10 * hour),
        },
      }),
      db.survivorSignal.create({
        data: {
          peopleCount: 1,
          urgencyLevel: 'need_medical',
          longitude: -47.4300, latitude: -20.5580,
          anonymize: true,
          expiresAt: new Date(now + 15 * hour),
        },
      }),
    ])

    // Pedidos de ajuda (com categorias e validações)
    const helpRequests = await Promise.all([
      db.helpRequest.create({
        data: {
          category: 'rescue',
          urgency: 'critical',
          status: 'validated',
          longitude: -47.4050, latitude: -20.5395,
          description: 'Família de 4 pessoas ilhadas no telhado, água subindo.',
          peopleCount: 4,
          vulnerableGroups: JSON.stringify(['criancas', 'idosos']),
          hasAnimals: true,
          animalCount: 2,
          animalDescription: '1 cachorro pequeno e 1 gato',
          validationCount: 5,
          denyCount: 0,
          communityVerified: true,
          expiresAt: new Date(now + 24 * hour),
        },
      }),
      db.helpRequest.create({
        data: {
          category: 'supplies',
          urgency: 'high',
          status: 'pending',
          longitude: -47.4150, latitude: -20.5440,
          description: 'Necessita água potável e cestas básicas urgentemente.',
          peopleCount: 6,
          vulnerableGroups: JSON.stringify(['gestantes']),
          hasAnimals: false,
          animalCount: 0,
          validationCount: 2,
          denyCount: 0,
          communityVerified: false,
          expiresAt: new Date(now + 48 * hour),
        },
      }),
      db.helpRequest.create({
        data: {
          category: 'medical',
          urgency: 'critical',
          status: 'in_progress',
          longitude: -47.3980, latitude: -20.5300,
          description: 'Pessoa idosa com problemas respiratórios precisa de oxigênio.',
          peopleCount: 1,
          vulnerableGroups: JSON.stringify(['idosos']),
          hasAnimals: false,
          animalCount: 0,
          validationCount: 7,
          denyCount: 1,
          communityVerified: true,
          officialVerified: true,
          expiresAt: new Date(now + 24 * hour),
        },
      }),
      db.helpRequest.create({
        data: {
          category: 'shelter',
          urgency: 'medium',
          status: 'validated',
          longitude: -47.4250, latitude: -20.5520,
          description: 'Família desabrigada precisa de acolhimento temporário.',
          peopleCount: 3,
          vulnerableGroups: JSON.stringify(['criancas']),
          hasAnimals: true,
          animalCount: 1,
          animalDescription: '1 cachorro de porte médio',
          validationCount: 4,
          denyCount: 0,
          communityVerified: true,
          expiresAt: new Date(now + 60 * hour),
        },
      }),
      db.helpRequest.create({
        data: {
          category: 'transport',
          urgency: 'high',
          status: 'pending',
          longitude: -47.4320, latitude: -20.5600,
          description: 'Precisa de transporte para hospital - consulta de hemodiálise.',
          peopleCount: 1,
          vulnerableGroups: JSON.stringify(['idosos', 'pcd']),
          hasAnimals: false,
          animalCount: 0,
          validationCount: 1,
          denyCount: 0,
          communityVerified: false,
          expiresAt: new Date(now + 48 * hour),
        },
      }),
      db.helpRequest.create({
        data: {
          category: 'rescue',
          urgency: 'high',
          status: 'pending',
          longitude: -47.3900, latitude: -20.5500,
          description: 'Pessoas presas em casa com água na cintura.',
          peopleCount: 5,
          vulnerableGroups: JSON.stringify(['criancas', 'idosos']),
          hasAnimals: true,
          animalCount: 3,
          animalDescription: '2 cachorros e 1 gato',
          validationCount: 3,
          denyCount: 0,
          communityVerified: true,
          expiresAt: new Date(now + 36 * hour),
        },
      }),
    ])

    // Algumas validações para os pedidos
    const validations = await Promise.all([
      db.helpRequestValidation.create({
        data: { requestId: helpRequests[0].id, vote: true, voterToken: 'seed-voter-1' },
      }),
      db.helpRequestValidation.create({
        data: { requestId: helpRequests[0].id, vote: true, voterToken: 'seed-voter-2' },
      }),
      db.helpRequestValidation.create({
        data: { requestId: helpRequests[2].id, vote: true, voterToken: 'seed-voter-1' },
      }),
      db.helpRequestValidation.create({
        data: { requestId: helpRequests[2].id, vote: true, voterToken: 'seed-voter-3' },
      }),
    ])

    return NextResponse.json({
      seeded: true,
      location: 'Franca/SP',
      counts: {
        incidents: incidents.length,
        shelters: shelters.length,
        survivors: survivors.length,
        helpRequests: helpRequests.length,
        validations: validations.length,
      },
    })
  } catch (err) {
    console.error('[api/seed]', err)
    return NextResponse.json({ error: 'Erro ao semear banco' }, { status: 500 })
  }
}
