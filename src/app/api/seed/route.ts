import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================================
//  POST /api/seed - popula o banco com dados de exemplo (Franca/SP)
//  Coordenadas de referência: -20.5389, -47.4008 (centro de Franca)
//
//  LOCAIS REAIS MAPEADOS:
//  - Córregos/rios (alagamentos): Pirelli, São José, Ribeirão dos Porcos
//  - Vias centrais: Av. Rio Branco, Av. Champagnat, Av. Dr. Júlio Cardoso
//  - Praças: Getúlio Vargas, da Bandeira
//  - Equipamentos de saúde: Hospital Regional, Hospital São Judas Tadeu, UBS Estiva
//  - Equipamentos esportivos/comunitários: Ginásio Paulo Cyrne, Estádio Lanchão Filho
//  - Bairros: Estiva, Quintassol, Jardim Paulistano, Jardim Primavera, Santa Mônica
// ============================================================================

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

    // ========================================================================
    //  ABRIGOS (equipamentos públicos reais de Franca/SP)
    // ========================================================================
    const shelters = await Promise.all([
      db.shelter.create({
        data: {
          name: 'Ginásio Municipal Paulo Cyrne de Oliveira',
          type: 'shelter',
          // Av. Champagnat, 1833 - Jardim Consolação
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
          // Av. dos Imigrantes, 1000 - Jardim Costa e Silva
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
          name: 'Hospital São Judas Tadeu',
          type: 'hospital',
          // R. Voluntários da Franca, 1900 - Centro
          longitude: -47.4090, latitude: -20.5300,
          capacityTotal: 120, capacityUsed: 87,
          capacityStatus: 'limited',
          contactInfo: JSON.stringify({ phone: '+55 16 3711-4000' }),
          suppliesNeeded: JSON.stringify(['medicamentos', 'materiais hospitalares']),
          notes: 'Hospital filantrópico. Atendimento de emergência.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'CEAGESP Franca - Posto de Distribuição',
          type: 'food_distribution',
          // Rod. Cândido Portinari, km 1 - Distrito Industrial
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
          name: 'UBS Estiva Dr. Pedro A. de Souza',
          type: 'hospital',
          // R. dos Inconfidentes, 200 - Jardim Estiva
          longitude: -47.4485, latitude: -20.5800,
          capacityTotal: 50, capacityUsed: 23,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 16 3723-2222' }),
          suppliesNeeded: JSON.stringify(['medicamentos básicos', 'antitérmicos']),
          notes: 'Posto de saúde comunitário. Atendimento de segunda a sexta.',
        },
      }),
      db.shelter.create({
        data: {
          name: 'Estádio Municipal Lanchão Filho',
          type: 'shelter',
          // R. Costa e Silva, 1500 - Jardim Tropical
          longitude: -47.4158, latitude: -20.5477,
          capacityTotal: 600, capacityUsed: 145,
          capacityStatus: 'available',
          contactInfo: JSON.stringify({ phone: '+55 16 3722-3500' }),
          suppliesNeeded: JSON.stringify(['água', 'cestas básicas']),
          notes: 'Estádio adaptado como abrigo temporário em situações de emergência.',
        },
      }),
    ])

    // ========================================================================
    //  INCIDENTES (em córregos e vias reais sujeitas a alagamento)
    // ========================================================================
    const incidents = await Promise.all([
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'high',
          // Córrego Pirelli - conhecido por transbordar (centro-leste)
          longitude: -47.3955, latitude: -20.5340,
          description: 'Córrego Pirelli transbordou, atingindo residências no entorno.',
          upvotes: 8, downvotes: 1, verified: true,
          expiresAt: new Date(now + 4 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'medium',
          // Av. Champagnat - via central de drenagem
          longitude: -47.4013, latitude: -20.5293,
          description: 'Ponto de alagamento na Av. Champagnat, trânsito lento.',
          upvotes: 4, downvotes: 0, verified: false,
          expiresAt: new Date(now + 3 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'roadblock',
          severity: 'critical',
          // Av. Rio Branco - via central, ponto crítico de alagamento
          longitude: -47.3988, latitude: -20.5335,
          description: 'Av. Rio Branco interditada - árvore caída e alagamento na pista.',
          upvotes: 12, downvotes: 0, verified: true,
          expiresAt: new Date(now + 2 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'safe_passage',
          severity: 'low',
          // Av. Dr. Júlio Cardoso - via alternativa liberada
          longitude: -47.4108, latitude: -20.5320,
          description: 'Rota alternativa liberada - Av. Dr. Júlio Cardoso sem alagamento.',
          upvotes: 6, downvotes: 1, verified: true,
          expiresAt: new Date(now + 1 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'landslide',
          severity: 'critical',
          // Bairro Quintassol - área de risco conhecida (encostas)
          longitude: -47.4358, latitude: -20.5650,
          description: 'Deslizamento no Quintassol, área de risco - evitar aproximação.',
          upvotes: 15, downvotes: 0, verified: true,
          expiresAt: new Date(now + 8 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'flood',
          severity: 'medium',
          // Córrego São José - região sul, transbordamento frequente
          longitude: -47.3885, latitude: -20.5477,
          description: 'Córrego São José transbordando, isolar área residencial.',
          upvotes: 7, downvotes: 0, verified: true,
          expiresAt: new Date(now + 5 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'roadblock',
          severity: 'high',
          // Praça Getúlio Vargas (centro) - árvore caída
          longitude: -47.4004, latitude: -20.5386,
          description: 'Árvore caída na Praça Getúlio Vargas, trânsito interrompido.',
          upvotes: 5, downvotes: 0, verified: false,
          expiresAt: new Date(now + 2 * hour),
        },
      }),
      db.incidentReport.create({
        data: {
          type: 'safe_passage',
          severity: 'low',
          // Av. dos Imigrantes - acesso ao Hospital Regional liberado
          longitude: -47.4200, latitude: -20.5430,
          description: 'Av. dos Imigrantes liberada - acesso ao Hospital Regional preservado.',
          upvotes: 9, downvotes: 0, verified: true,
          expiresAt: new Date(now + 3 * hour),
        },
      }),
    ])

    // ========================================================================
    //  SOBREVIVENTES (próximos a áreas de risco reais)
    // ========================================================================
    const survivors = await Promise.all([
      db.survivorSignal.create({
        data: {
          peopleCount: 4,
          urgencyLevel: 'need_evacuation',
          // Próximo ao Córrego Pirelli (já alagado)
          longitude: -47.3965, latitude: -20.5345,
          anonymize: true,
          expiresAt: new Date(now + 20 * hour),
        },
      }),
      db.survivorSignal.create({
        data: {
          peopleCount: 2,
          urgencyLevel: 'safe_waiting',
          // Bairro Quintassol (área de deslizamento)
          longitude: -47.4360, latitude: -20.5655,
          anonymize: true,
          expiresAt: new Date(now + 10 * hour),
        },
      }),
      db.survivorSignal.create({
        data: {
          peopleCount: 1,
          urgencyLevel: 'need_medical',
          // Próximo ao Ribeirão dos Porcos (área sul)
          longitude: -47.4200, latitude: -20.5600,
          anonymize: true,
          expiresAt: new Date(now + 15 * hour),
        },
      }),
    ])

    // ========================================================================
    //  PEDIDOS DE AJUDA (em bairros periféricos e áreas afetadas reais)
    // ========================================================================

    // 1. RESGATE - família ilhada no telhado perto do Córrego Pirelli
    const rescue1 = await db.helpRequest.create({
      data: {
        category: 'rescue',
        urgency: 'critical',
        status: 'validated',
        longitude: -47.3960, latitude: -20.5348, // Perto do Córrego Pirelli
        description: 'Família de 4 pessoas ilhadas no telhado, água subindo rápido no Córrego Pirelli.',
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
    })

    // 2. SUPRIMENTOS - Estiva, bairro periférico
    const supplies1 = await db.helpRequest.create({
      data: {
        category: 'supplies',
        urgency: 'high',
        status: 'pending',
        longitude: -47.4480, latitude: -20.5805, // Jardim Estiva
        description: 'Família no Estiva sem acesso a água potável e cestas básicas há 12h.',
        peopleCount: 6,
        vulnerableGroups: JSON.stringify(['gestantes']),
        hasAnimals: false,
        animalCount: 0,
        validationCount: 2,
        denyCount: 0,
        communityVerified: false,
        expiresAt: new Date(now + 48 * hour),
      },
    })

    // 3. MÉDICO - pessoa idosa perto do Hospital Regional
    const medical1 = await db.helpRequest.create({
      data: {
        category: 'medical',
        urgency: 'critical',
        status: 'in_progress',
        longitude: -47.4215, latitude: -20.5435, // Próximo ao Hospital Regional
        description: 'Pessoa idosa com problemas respiratórios precisa de oxigênio. Não consegue chegar ao hospital.',
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
    })

    // 4. ABRIGO - famílias desabrigadas no Quintassol (pós-deslizamento)
    const shelter1 = await db.helpRequest.create({
      data: {
        category: 'shelter',
        urgency: 'medium',
        status: 'validated',
        longitude: -47.4355, latitude: -20.5645, // Quintassol
        description: '3 famílias desabrigadas após deslizamento no Quintassol precisam de acolhimento.',
        peopleCount: 12,
        vulnerableGroups: JSON.stringify(['criancas', 'idosos']),
        hasAnimals: true,
        animalCount: 4,
        animalDescription: '2 cachorros e 2 gatos',
        validationCount: 4,
        denyCount: 0,
        communityVerified: true,
        expiresAt: new Date(now + 60 * hour),
      },
    })

    // 5. TRANSPORTE - paciente de hemodiálise precisa chegar ao hospital
    const transport1 = await db.helpRequest.create({
      data: {
        category: 'transport',
        urgency: 'high',
        status: 'pending',
        longitude: -47.4250, latitude: -20.5520, // Jardim Paulistano
        description: 'Paciente de hemodiálise no Jardim Paulistano sem transporte para o Hospital Regional.',
        peopleCount: 1,
        vulnerableGroups: JSON.stringify(['idosos', 'pcd']),
        hasAnimals: false,
        animalCount: 0,
        validationCount: 1,
        denyCount: 0,
        communityVerified: false,
        expiresAt: new Date(now + 48 * hour),
      },
    })

    // 6. RESGATE - pessoas presas perto do Ribeirão dos Porcos
    const rescue2 = await db.helpRequest.create({
      data: {
        category: 'rescue',
        urgency: 'high',
        status: 'pending',
        longitude: -47.4195, latitude: -20.5605, // Ribeirão dos Porcos
        description: '5 pessoas presas em casa com água na cintura perto do Ribeirão dos Porcos.',
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
    })

    // 7. SUPRIMENTOS - Jardim Primavera, bairro periférico
    const supplies2 = await db.helpRequest.create({
      data: {
        category: 'supplies',
        urgency: 'medium',
        status: 'pending',
        longitude: -47.4100, latitude: -20.5580, // Jardim Primavera
        description: 'Comunidade do Jardim Primavera isolada, precisando de água e medicamentos.',
        peopleCount: 15,
        vulnerableGroups: JSON.stringify(['criancas', 'idosos', 'gestantes']),
        hasAnimals: false,
        animalCount: 0,
        validationCount: 2,
        denyCount: 0,
        communityVerified: false,
        expiresAt: new Date(now + 48 * hour),
      },
    })

    // 8. MÉDICO - paciente crônico no Santa Mônica
    const medical2 = await db.helpRequest.create({
      data: {
        category: 'medical',
        urgency: 'high',
        status: 'validated',
        longitude: -47.4320, latitude: -20.5480, // Santa Mônica
        description: 'Paciente diabético sem insulina há 8h no bairro Santa Mônica.',
        peopleCount: 1,
        vulnerableGroups: JSON.stringify(['idosos', 'pcd']),
        hasAnimals: false,
        animalCount: 0,
        validationCount: 4,
        denyCount: 0,
        communityVerified: true,
        expiresAt: new Date(now + 24 * hour),
      },
    })

    // ========================================================================
    //  VALIDAÇÕES COMUNITÁRIAS (votos reais em alguns pedidos)
    // ========================================================================
    const helpRequestIds = [rescue1.id, medical1.id, shelter1.id, rescue2.id, medical2.id]
    const validations = await Promise.all([
      // 5 confirmações para rescue1 (validated)
      db.helpRequestValidation.create({ data: { requestId: rescue1.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: rescue1.id, vote: true, voterToken: 'seed-voter-2' } }),
      db.helpRequestValidation.create({ data: { requestId: rescue1.id, vote: true, voterToken: 'seed-voter-3' } }),
      db.helpRequestValidation.create({ data: { requestId: rescue1.id, vote: true, voterToken: 'seed-voter-4' } }),
      db.helpRequestValidation.create({ data: { requestId: rescue1.id, vote: true, voterToken: 'seed-voter-5' } }),

      // 7 confirmações + 1 denúncia para medical1 (validated + officialVerified)
      db.helpRequestValidation.create({ data: { requestId: medical1.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: medical1.id, vote: true, voterToken: 'seed-voter-2' } }),
      db.helpRequestValidation.create({ data: { requestId: medical1.id, vote: true, voterToken: 'seed-voter-3' } }),
      db.helpRequestValidation.create({ data: { requestId: medical1.id, vote: true, voterToken: 'seed-voter-4' } }),
      db.helpRequestValidation.create({ data: { requestId: medical1.id, vote: false, voterToken: 'seed-voter-5', comment: 'Acho que já foi atendido' } }),

      // 4 confirmações para shelter1 (validated)
      db.helpRequestValidation.create({ data: { requestId: shelter1.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: shelter1.id, vote: true, voterToken: 'seed-voter-2' } }),
      db.helpRequestValidation.create({ data: { requestId: shelter1.id, vote: true, voterToken: 'seed-voter-3' } }),
      db.helpRequestValidation.create({ data: { requestId: shelter1.id, vote: true, voterToken: 'seed-voter-4' } }),

      // 3 confirmações para rescue2 (communityVerified)
      db.helpRequestValidation.create({ data: { requestId: rescue2.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: rescue2.id, vote: true, voterToken: 'seed-voter-2' } }),
      db.helpRequestValidation.create({ data: { requestId: rescue2.id, vote: true, voterToken: 'seed-voter-3' } }),

      // 4 confirmações para medical2 (validated)
      db.helpRequestValidation.create({ data: { requestId: medical2.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: medical2.id, vote: true, voterToken: 'seed-voter-2' } }),
      db.helpRequestValidation.create({ data: { requestId: medical2.id, vote: true, voterToken: 'seed-voter-3' } }),
      db.helpRequestValidation.create({ data: { requestId: medical2.id, vote: true, voterToken: 'seed-voter-4' } }),

      // 2 confirmações para supplies1 (ainda não verificado)
      db.helpRequestValidation.create({ data: { requestId: supplies1.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: supplies1.id, vote: true, voterToken: 'seed-voter-2' } }),

      // 2 confirmações para supplies2 (ainda não verificado)
      db.helpRequestValidation.create({ data: { requestId: supplies2.id, vote: true, voterToken: 'seed-voter-1' } }),
      db.helpRequestValidation.create({ data: { requestId: supplies2.id, vote: true, voterToken: 'seed-voter-2' } }),

      // 1 confirmação para transport1 (ainda não verificado)
      db.helpRequestValidation.create({ data: { requestId: transport1.id, vote: true, voterToken: 'seed-voter-1' } }),
    ])

    return NextResponse.json({
      seeded: true,
      location: 'Franca/SP',
      counts: {
        incidents: incidents.length,
        shelters: shelters.length,
        survivors: survivors.length,
        helpRequests: 8,
        validations: validations.length,
      },
    })
  } catch (err) {
    console.error('[api/seed]', err)
    return NextResponse.json({ error: 'Erro ao semear banco' }, { status: 500 })
  }
}
