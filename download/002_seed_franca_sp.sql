-- ============================================================================
--  Plataforma Rotas Seguras - Seed Inicial (Franca/SP)
--  Migration: 002_seed_franca_sp.sql
--  Descrição: Dados de exemplo para a cidade de Franca/SP
--  Stack alvo: PostgreSQL + PostGIS (Supabase)
--  Pré-requisito: executar 001_postgis_schema.sql antes
-- ============================================================================

-- Limpa dados anteriores (caso esteja re-executando)
DELETE FROM route_validations;
DELETE FROM incident_reports;
DELETE FROM shelters;
DELETE FROM survivor_signals;

-- ============================================================================
--  ABRIGOS EM FRANCA/SP
-- ============================================================================

INSERT INTO shelters (name, type, location, capacity_total, capacity_used, capacity_status, contact_info, supplies_needed, notes)
VALUES
  (
    'Ginásio Municipal Paulo Cyrne de Oliveira',
    'shelter',
    ST_SetSRID(ST_MakePoint(-47.4130, -20.5358), 4326),
    800, 312, 'available',
    '{"phone": "+55 16 3721-2000", "whatsapp": "+55 16 99999-0001"}'::jsonb,
    ARRAY['água potável', 'colchões', 'roupas de cama', 'fraldas'],
    'Acessível a cadeirantes. Aceita animais de estimação pequenos.'
  ),
  (
    'Hospital Regional de Franca',
    'hospital',
    ST_SetSRID(ST_MakePoint(-47.4221, -20.5441), 4326),
    200, 158, 'limited',
    '{"phone": "+55 16 3722-5000"}'::jsonb,
    ARRAY['medicamentos', 'soros', 'soro fisiológico'],
    'Atendimento de emergência 24h. Pronto-socorro ativo.'
  ),
  (
    'CEAGESP Franca - Posto de Distribuição',
    'food_distribution',
    ST_SetSRID(ST_MakePoint(-47.3958, -20.5270), 4326),
    0, 0, 'available',
    '{"phone": "+55 16 3723-1111"}'::jsonb,
    ARRAY[]::TEXT[],
    'Distribuição de cestas básicas e água diariamente às 9h e 15h.'
  ),
  (
    'UBS Estiva (Posto de Saúde)',
    'hospital',
    ST_SetSRID(ST_MakePoint(-47.4485, -20.5800), 4326),
    50, 23, 'available',
    '{"phone": "+55 16 3723-2222"}'::jsonb,
    ARRAY['medicamentos básicos'],
    'Posto de saúde comunitário.'
  );

-- ============================================================================
--  INCIDENTES EM FRANCA/SP
--  NOTA: a trigger trg_incidents_ttl vai definir expires_at automaticamente
-- ============================================================================

INSERT INTO incident_reports (type, severity, location, description, upvotes, downvotes, verified)
VALUES
  (
    'flood', 'high',
    ST_SetSRID(ST_MakePoint(-47.4008, -20.5389), 4326),
    'Alagamento na região central, nível alto.',
    8, 1, true
  ),
  (
    'flood', 'medium',
    ST_SetSRID(ST_MakePoint(-47.4013, -20.5290), 4326),
    'Ponto de alagamento na Champagnat, trânsito lento.',
    4, 0, false
  ),
  (
    'roadblock', 'critical',
    ST_SetSRID(ST_MakePoint(-47.3988, -20.5335), 4326),
    'Via interditada - árvore caída e alagamento.',
    12, 0, true
  ),
  (
    'safe_passage', 'low',
    ST_SetSRID(ST_MakePoint(-47.4108, -20.5320), 4326),
    'Rota alternativa liberada - via Júlio Cardoso.',
    6, 1, true
  ),
  (
    'landslide', 'critical',
    ST_SetSRID(ST_MakePoint(-47.4358, -20.5650), 4326),
    'Deslizamento na região leste, evitar aproximação.',
    15, 0, true
  ),
  (
    'flood', 'medium',
    ST_SetSRID(ST_MakePoint(-47.3885, -20.5477), 4326),
    'Córrego São José transbordando, isolar área.',
    7, 0, true
  );

-- ============================================================================
--  SINAIS DE SOBREVIVENTES EM FRANCA/SP
--  NOTA: a trigger trg_survivors_ttl define expires_at = now() + 24h
-- ============================================================================

INSERT INTO survivor_signals (people_count, urgency_level, location, anonymize)
VALUES
  (4, 'need_evacuation', ST_SetSRID(ST_MakePoint(-47.4015, -20.5410), 4326), true),
  (2, 'safe_waiting',     ST_SetSRID(ST_MakePoint(-47.4060, -20.5480), 4326), true),
  (1, 'need_medical',     ST_SetSRID(ST_MakePoint(-47.4300, -20.5580), 4326), true);

-- ============================================================================
--  Verificação (rode manualmente para conferir)
-- ============================================================================

-- SELECT 'Abrigos em Franca' AS label, count(*) FROM shelters;
-- SELECT 'Incidentes em Franca' AS label, count(*) FROM incident_reports;
-- SELECT 'Sobreviventes ativos' AS label, count(*) FROM survivor_signals WHERE is_resolved = false;

-- ============================================================================
--  Fim do seed 002_seed_franca_sp.sql
-- ============================================================================
