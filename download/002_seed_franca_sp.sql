-- ============================================================================
--  Plataforma Rotas Seguras - Seed Inicial (Franca/SP)
--  Migration: 002_seed_franca_sp.sql
--  Descrição: Dados de exemplo com LOCAIS REAIS de Franca/SP
--  Stack alvo: PostgreSQL + PostGIS (Supabase)
--  Pré-requisito: executar 001_postgis_schema.sql e 003_help_requests.sql antes
-- ============================================================================

-- Limpa dados anteriores (caso esteja re-executando)
DELETE FROM route_validations;
DELETE FROM incident_reports;
DELETE FROM shelters;
DELETE FROM survivor_signals;
DELETE FROM help_request_validations;
DELETE FROM help_requests;
DELETE FROM moderation_reports;

-- ============================================================================
--  ABRIGOS EM LOCAIS REAIS DE FRANCA/SP
-- ============================================================================

INSERT INTO shelters (name, type, location, capacity_total, capacity_used, capacity_status, contact_info, supplies_needed, notes)
VALUES
  (
    'Ginásio Municipal Paulo Cyrne de Oliveira',
    'shelter',
    -- Av. Champagnat, 1833 - Jardim Consolação
    ST_SetSRID(ST_MakePoint(-47.4130, -20.5358), 4326),
    800, 312, 'available',
    '{"phone": "+55 16 3721-2000", "whatsapp": "+55 16 99999-0001"}'::jsonb,
    ARRAY['água potável', 'colchões', 'roupas de cama', 'fraldas'],
    'Acessível a cadeirantes. Aceita animais de estimação pequenos.'
  ),
  (
    'Hospital Regional de Franca',
    'hospital',
    -- Av. dos Imigrantes, 1000 - Jardim Costa e Silva
    ST_SetSRID(ST_MakePoint(-47.4221, -20.5441), 4326),
    200, 158, 'limited',
    '{"phone": "+55 16 3722-5000"}'::jsonb,
    ARRAY['medicamentos', 'soros', 'soro fisiológico'],
    'Atendimento de emergência 24h. Pronto-socorro ativo.'
  ),
  (
    'Hospital São Judas Tadeu',
    'hospital',
    -- R. Voluntários da Franca, 1900 - Centro
    ST_SetSRID(ST_MakePoint(-47.4090, -20.5300), 4326),
    120, 87, 'limited',
    '{"phone": "+55 16 3711-4000"}'::jsonb,
    ARRAY['medicamentos', 'materiais hospitalares'],
    'Hospital filantrópico. Atendimento de emergência.'
  ),
  (
    'CEAGESP Franca - Posto de Distribuição',
    'food_distribution',
    -- Rod. Cândido Portinari, km 1 - Distrito Industrial
    ST_SetSRID(ST_MakePoint(-47.3958, -20.5270), 4326),
    0, 0, 'available',
    '{"phone": "+55 16 3723-1111"}'::jsonb,
    ARRAY[]::TEXT[],
    'Distribuição de cestas básicas e água diariamente às 9h e 15h.'
  ),
  (
    'UBS Estiva Dr. Pedro A. de Souza',
    'hospital',
    -- R. dos Inconfidentes, 200 - Jardim Estiva
    ST_SetSRID(ST_MakePoint(-47.4485, -20.5800), 4326),
    50, 23, 'available',
    '{"phone": "+55 16 3723-2222"}'::jsonb,
    ARRAY['medicamentos básicos', 'antitérmicos'],
    'Posto de saúde comunitário. Atendimento de segunda a sexta.'
  ),
  (
    'Estádio Municipal Lanchão Filho',
    'shelter',
    -- R. Costa e Silva, 1500 - Jardim Tropical
    ST_SetSRID(ST_MakePoint(-47.4158, -20.5477), 4326),
    600, 145, 'available',
    '{"phone": "+55 16 3722-3500"}'::jsonb,
    ARRAY['água', 'cestas básicas'],
    'Estádio adaptado como abrigo temporário em situações de emergência.'
  );

-- ============================================================================
--  INCIDENTES EM LOCAIS REAIS (córregos e vias sujeitas a alagamento)
-- ============================================================================

INSERT INTO incident_reports (type, severity, location, description, upvotes, downvotes, verified)
VALUES
  (
    'flood', 'high',
    -- Córrego Pirelli - conhecido por transbordar (centro-leste)
    ST_SetSRID(ST_MakePoint(-47.3955, -20.5340), 4326),
    'Córrego Pirelli transbordou, atingindo residências no entorno.',
    8, 1, true
  ),
  (
    'flood', 'medium',
    -- Av. Champagnat - via central de drenagem
    ST_SetSRID(ST_MakePoint(-47.4013, -20.5293), 4326),
    'Ponto de alagamento na Av. Champagnat, trânsito lento.',
    4, 0, false
  ),
  (
    'roadblock', 'critical',
    -- Av. Rio Branco - via central, ponto crítico de alagamento
    ST_SetSRID(ST_MakePoint(-47.3988, -20.5335), 4326),
    'Av. Rio Branco interditada - árvore caída e alagamento na pista.',
    12, 0, true
  ),
  (
    'safe_passage', 'low',
    -- Av. Dr. Júlio Cardoso - via alternativa liberada
    ST_SetSRID(ST_MakePoint(-47.4108, -20.5320), 4326),
    'Rota alternativa liberada - Av. Dr. Júlio Cardoso sem alagamento.',
    6, 1, true
  ),
  (
    'landslide', 'critical',
    -- Bairro Quintassol - área de risco conhecida (encostas)
    ST_SetSRID(ST_MakePoint(-47.4358, -20.5650), 4326),
    'Deslizamento no Quintassol, área de risco - evitar aproximação.',
    15, 0, true
  ),
  (
    'flood', 'medium',
    -- Córrego São José - região sul, transbordamento frequente
    ST_SetSRID(ST_MakePoint(-47.3885, -20.5477), 4326),
    'Córrego São José transbordando, isolar área residencial.',
    7, 0, true
  ),
  (
    'roadblock', 'high',
    -- Praça Getúlio Vargas (centro) - árvore caída
    ST_SetSRID(ST_MakePoint(-47.4004, -20.5386), 4326),
    'Árvore caída na Praça Getúlio Vargas, trânsito interrompido.',
    5, 0, false
  ),
  (
    'safe_passage', 'low',
    -- Av. dos Imigrantes - acesso ao Hospital Regional liberado
    ST_SetSRID(ST_MakePoint(-47.4200, -20.5430), 4326),
    'Av. dos Imigrantes liberada - acesso ao Hospital Regional preservado.',
    9, 0, true
  );

-- ============================================================================
--  SOBREVIVENTES (próximos a áreas de risco reais)
-- ============================================================================

INSERT INTO survivor_signals (people_count, urgency_level, location, anonymize)
VALUES
  (
    4, 'need_evacuation',
    -- Próximo ao Córrego Pirelli (já alagado)
    ST_SetSRID(ST_MakePoint(-47.3965, -20.5345), 4326),
    true
  ),
  (
    2, 'safe_waiting',
    -- Bairro Quintassol (área de deslizamento)
    ST_SetSRID(ST_MakePoint(-47.4360, -20.5655), 4326),
    true
  ),
  (
    1, 'need_medical',
    -- Próximo ao Ribeirão dos Porcos (área sul)
    ST_SetSRID(ST_MakePoint(-47.4200, -20.5600), 4326),
    true
  );

-- ============================================================================
--  PEDIDOS DE AJUDA (em bairros periféricos e áreas afetadas reais)
-- ============================================================================

-- 1. RESGATE - família ilhada perto do Córrego Pirelli
INSERT INTO help_requests (category, urgency, status, location, description, people_count, vulnerable_groups, has_animals, animal_count, animal_description, validation_count, deny_count, community_verified, expires_at)
VALUES
  (
    'rescue', 'critical', 'validated',
    ST_SetSRID(ST_MakePoint(-47.3960, -20.5348), 4326), -- Perto do Córrego Pirelli
    'Família de 4 pessoas ilhadas no telhado, água subindo rápido no Córrego Pirelli.',
    4, ARRAY['criancas','idosos'], true, 2, '1 cachorro pequeno e 1 gato',
    5, 0, true, now() + INTERVAL '24 hours'
  ),
  -- 2. SUPRIMENTOS - Estiva, bairro periférico
  (
    'supplies', 'high', 'pending',
    ST_SetSRID(ST_MakePoint(-47.4480, -20.5805), 4326), -- Jardim Estiva
    'Família no Estiva sem acesso a água potável e cestas básicas há 12h.',
    6, ARRAY['gestantes'], false, 0, null,
    2, 0, false, now() + INTERVAL '48 hours'
  ),
  -- 3. MÉDICO - pessoa idosa perto do Hospital Regional (verificado oficial)
  (
    'medical', 'critical', 'in_progress',
    ST_SetSRID(ST_MakePoint(-47.4215, -20.5435), 4326), -- Próximo ao Hospital Regional
    'Pessoa idosa com problemas respiratórios precisa de oxigênio. Não consegue chegar ao hospital.',
    1, ARRAY['idosos'], false, 0, null,
    7, 1, true, now() + INTERVAL '24 hours'
  ),
  -- 4. ABRIGO - famílias desabrigadas no Quintassol (pós-deslizamento)
  (
    'shelter', 'medium', 'validated',
    ST_SetSRID(ST_MakePoint(-47.4355, -20.5645), 4326), -- Quintassol
    '3 famílias desabrigadas após deslizamento no Quintassol precisam de acolhimento.',
    12, ARRAY['criancas','idosos'], true, 4, '2 cachorros e 2 gatos',
    4, 0, true, now() + INTERVAL '60 hours'
  ),
  -- 5. TRANSPORTE - paciente de hemodiálise no Jardim Paulistano
  (
    'transport', 'high', 'pending',
    ST_SetSRID(ST_MakePoint(-47.4250, -20.5520), 4326), -- Jardim Paulistano
    'Paciente de hemodiálise no Jardim Paulistano sem transporte para o Hospital Regional.',
    1, ARRAY['idosos','pcd'], false, 0, null,
    1, 0, false, now() + INTERVAL '48 hours'
  ),
  -- 6. RESGATE - pessoas presas perto do Ribeirão dos Porcos
  (
    'rescue', 'high', 'pending',
    ST_SetSRID(ST_MakePoint(-47.4195, -20.5605), 4326), -- Ribeirão dos Porcos
    '5 pessoas presas em casa com água na cintura perto do Ribeirão dos Porcos.',
    5, ARRAY['criancas','idosos'], true, 3, '2 cachorros e 1 gato',
    3, 0, true, now() + INTERVAL '36 hours'
  ),
  -- 7. SUPRIMENTOS - Jardim Primavera, bairro periférico
  (
    'supplies', 'medium', 'pending',
    ST_SetSRID(ST_MakePoint(-47.4100, -20.5580), 4326), -- Jardim Primavera
    'Comunidade do Jardim Primavera isolada, precisando de água e medicamentos.',
    15, ARRAY['criancas','idosos','gestantes'], false, 0, null,
    2, 0, false, now() + INTERVAL '48 hours'
  ),
  -- 8. MÉDICO - paciente crônico no Santa Mônica
  (
    'medical', 'high', 'validated',
    ST_SetSRID(ST_MakePoint(-47.4320, -20.5480), 4326), -- Santa Mônica
    'Paciente diabético sem insulina há 8h no bairro Santa Mônica.',
    1, ARRAY['idosos','pcd'], false, 0, null,
    4, 0, true, now() + INTERVAL '24 hours'
  );

-- Marca pedido médico como verificado oficialmente (próximo ao Hospital Regional)
SELECT mark_official_verified(
  (SELECT id FROM help_requests
   WHERE description LIKE 'Pessoa idosa com problemas respiratórios%'
   LIMIT 1)
);

-- ============================================================================
--  VALIDAÇÕES COMUNITÁRIAS (votos reais)
-- ============================================================================

INSERT INTO help_request_validations (request_id, vote, comment, voter_token)
SELECT hr.id, v.vote, v.comment, v.voter_token
FROM help_requests hr
JOIN (
  VALUES
    -- Pedido 1: resgate família ilhada Pirelli (5 confirmações)
    ('Família de 4 pessoas ilhadas no telhado%', true, null, 'seed-voter-1'),
    ('Família de 4 pessoas ilhadas no telhado%', true, null, 'seed-voter-2'),
    ('Família de 4 pessoas ilhadas no telhado%', true, null, 'seed-voter-3'),
    ('Família de 4 pessoas ilhadas no telhado%', true, null, 'seed-voter-4'),
    ('Família de 4 pessoas ilhadas no telhado%', true, null, 'seed-voter-5'),
    -- Pedido 3: médico idoso Hospital Regional (7 confirms + 1 deny)
    ('Pessoa idosa com problemas respiratórios%', true, null, 'seed-voter-1'),
    ('Pessoa idosa com problemas respiratórios%', true, null, 'seed-voter-2'),
    ('Pessoa idosa com problemas respiratórios%', true, null, 'seed-voter-3'),
    ('Pessoa idosa com problemas respiratórios%', true, null, 'seed-voter-4'),
    ('Pessoa idosa com problemas respiratórios%', false, 'Acho que já foi atendido', 'seed-voter-5'),
    -- Pedido 4: abrigo Quintassol (4 confirmações)
    ('3 famílias desabrigadas após deslizamento%', true, null, 'seed-voter-1'),
    ('3 famílias desabrigadas após deslizamento%', true, null, 'seed-voter-2'),
    ('3 famílias desabrigadas após deslizamento%', true, null, 'seed-voter-3'),
    ('3 famílias desabrigadas após deslizamento%', true, null, 'seed-voter-4'),
    -- Pedido 6: resgate Ribeirão dos Porcos (3 confirmações)
    ('5 pessoas presas em casa com água na cintura%', true, null, 'seed-voter-1'),
    ('5 pessoas presas em casa com água na cintura%', true, null, 'seed-voter-2'),
    ('5 pessoas presas em casa com água na cintura%', true, null, 'seed-voter-3'),
    -- Pedido 8: médico Santa Mônica (4 confirmações)
    ('Paciente diabético sem insulina%', true, null, 'seed-voter-1'),
    ('Paciente diabético sem insulina%', true, null, 'seed-voter-2'),
    ('Paciente diabético sem insulina%', true, null, 'seed-voter-3'),
    ('Paciente diabético sem insulina%', true, null, 'seed-voter-4'),
    -- Pedido 2: suprimentos Estiva (2 confirmações)
    ('Família no Estiva sem acesso%', true, null, 'seed-voter-1'),
    ('Família no Estiva sem acesso%', true, null, 'seed-voter-2'),
    -- Pedido 7: suprimentos Jardim Primavera (2 confirmações)
    ('Comunidade do Jardim Primavera isolada%', true, null, 'seed-voter-1'),
    ('Comunidade do Jardim Primavera isolada%', true, null, 'seed-voter-2'),
    -- Pedido 5: transporte Jardim Paulistano (1 confirmação)
    ('Paciente de hemodiálise no Jardim Paulistano%', true, null, 'seed-voter-1')
) AS v(description_pattern, vote, comment, voter_token)
ON hr.description LIKE v.description_pattern;

-- ============================================================================
--  Verificação (rode manualmente para conferir)
-- ============================================================================

-- SELECT 'Abrigos' AS label, count(*) FROM shelters
-- UNION ALL
-- SELECT 'Incidentes', count(*) FROM incident_reports
-- UNION ALL
-- SELECT 'Sobreviventes', count(*) FROM survivor_signals WHERE is_resolved = false
-- UNION ALL
-- SELECT 'Pedidos de ajuda', count(*) FROM help_requests
-- UNION ALL
-- SELECT 'Validações', count(*) FROM help_request_validations;

-- ============================================================================
--  Fim do seed 002_seed_franca_sp.sql
-- ============================================================================
