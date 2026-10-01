-- ============================================================================
--  Plataforma Rotas Seguras - Schema PostGIS / Supabase
--  Migration: 001_postgis_schema.sql
--  Descrição: Criação de tabelas, índices espaciais e triggers de TTL
--  Stack alvo: PostgreSQL 15+ com extensão PostGIS habilitada (Supabase)
-- ============================================================================

-- 1. Habilita extensões necessárias -----------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Enums compartilhados ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE incident_type_enum AS ENUM
    ('flood', 'landslide', 'safe_passage', 'roadblock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity_enum AS ENUM
    ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shelter_type_enum AS ENUM
    ('shelter', 'hospital', 'food_distribution', 'checkpoint');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE capacity_status_enum AS ENUM
    ('available', 'limited', 'full', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE survivor_urgency_enum AS ENUM
    ('safe_waiting', 'need_medical', 'need_evacuation', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabela: incident_reports ------------------------------------------------
CREATE TABLE IF NOT EXISTS incident_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          incident_type_enum    NOT NULL,
  severity      incident_severity_enum NOT NULL DEFAULT 'medium',
  location      geometry(Point, 4326) NOT NULL,
  description   TEXT,
  upvotes       INTEGER NOT NULL DEFAULT 0,
  downvotes     INTEGER NOT NULL DEFAULT 0,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  reporter_id   UUID,                       -- sem FK por padrão (anonimização)
  expires_at    TIMESTAMPTZ,                -- NULL = sem expiração automática
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_votes_non_negative
    CHECK (upvotes >= 0 AND downvotes >= 0)
);

-- Índices espaciais e de filtragem
CREATE INDEX IF NOT EXISTS idx_incidents_location
  ON incident_reports USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_incidents_type
  ON incident_reports (type);

CREATE INDEX IF NOT EXISTS idx_incidents_expires
  ON incident_reports (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_verified
  ON incident_reports (verified);

CREATE INDEX IF NOT EXISTS idx_incidents_created_at
  ON incident_reports (created_at DESC);

-- 4. Tabela: shelters --------------------------------------------------------
CREATE TABLE IF NOT EXISTS shelters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  type            shelter_type_enum NOT NULL DEFAULT 'shelter',
  location        geometry(Point, 4326) NOT NULL,
  capacity_total  INTEGER NOT NULL DEFAULT 0,
  capacity_used   INTEGER NOT NULL DEFAULT 0,
  capacity_status capacity_status_enum NOT NULL DEFAULT 'unknown',
  contact_info    JSONB,                     -- { phone, whatsapp, email }
  supplies_needed TEXT[],                    -- lista de itens em falta
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_capacity_non_negative
    CHECK (capacity_total >= 0 AND capacity_used >= 0)
);

CREATE INDEX IF NOT EXISTS idx_shelters_location
  ON shelters USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_shelters_type
  ON shelters (type);

CREATE INDEX IF NOT EXISTS idx_shelters_active
  ON shelters (is_active) WHERE is_active = TRUE;

-- 5. Tabela: survivor_signals ------------------------------------------------
CREATE TABLE IF NOT EXISTS survivor_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  people_count    INTEGER NOT NULL DEFAULT 1,
  urgency_level   survivor_urgency_enum NOT NULL DEFAULT 'safe_waiting',
  location        geometry(Point, 4326) NOT NULL,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  contact_encrypted BYTEA,                   -- cifrado com pgcrypto
  anonymize       BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ,                -- TTL curto por padrão (24h)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_people_count_positive
    CHECK (people_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_survivors_location
  ON survivor_signals USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_survivors_resolved
  ON survivor_signals (is_resolved) WHERE is_resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_survivors_urgency
  ON survivor_signals (urgency_level);

CREATE INDEX IF NOT EXISTS idx_survivors_expires
  ON survivor_signals (expires_at)
  WHERE expires_at IS NOT NULL;

-- 6. Tabela: route_validations (sistema de votação social) ------------------
CREATE TABLE IF NOT EXISTS route_validations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  voter_id        UUID,
  vote            BOOLEAN NOT NULL,           -- TRUE = confirmado / FALSE = resolvido
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_val_incident
  ON route_validations (incident_id);

CREATE INDEX IF NOT EXISTS idx_route_val_created
  ON route_validations (created_at DESC);

-- 7. Triggers de updated_at --------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_updated ON incident_reports;
CREATE TRIGGER trg_incidents_updated
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shelters_updated ON shelters;
CREATE TRIGGER trg_shelters_updated
  BEFORE UPDATE ON shelters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_survivors_updated ON survivor_signals;
CREATE TRIGGER trg_survivors_updated
  BEFORE UPDATE ON survivor_signals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. Trigger de TTL: expiração automática por tipo ---------------------------
-- Default TTL baseado no tipo do incidente
CREATE OR REPLACE FUNCTION set_default_expiry()
RETURNS TRIGGER AS $$
DECLARE
  ttl_interval INTERVAL;
BEGIN
  IF NEW.expires_at IS NULL THEN
    CASE NEW.type
      WHEN 'flood'         THEN ttl_interval := INTERVAL '6 hours';
      WHEN 'landslide'     THEN ttl_interval := INTERVAL '12 hours';
      WHEN 'roadblock'     THEN ttl_interval := INTERVAL '4 hours';
      WHEN 'safe_passage'  THEN ttl_interval := INTERVAL '2 hours';
      ELSE ttl_interval := INTERVAL '24 hours';
    END CASE;
    NEW.expires_at := now() + ttl_interval;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_ttl ON incident_reports;
CREATE TRIGGER trg_incidents_ttl
  BEFORE INSERT ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION set_default_expiry();

-- Survivor signals: TTL padrão de 24h se não informado
CREATE OR REPLACE FUNCTION set_survivor_ttl()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_survivors_ttl ON survivor_signals;
CREATE TRIGGER trg_survivors_ttl
  BEFORE INSERT ON survivor_signals
  FOR EACH ROW EXECUTE FUNCTION set_survivor_ttl();

-- 9. Função de marcação automática de expirados -----------------------------
CREATE OR REPLACE FUNCTION mark_expired_incidents()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE incident_reports
     SET verified = FALSE
   WHERE expires_at IS NOT NULL
     AND expires_at < now()
     AND verified = TRUE;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_expired_survivors()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE survivor_signals
     SET is_resolved = TRUE
   WHERE expires_at IS NOT NULL
     AND expires_at < now()
     AND is_resolved = FALSE;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Row Level Security (RLS) ----------------------------------------------
ALTER TABLE incident_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_validations ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública, escrita autenticada
CREATE POLICY "public_read_incidents"  ON incident_reports  FOR SELECT USING (TRUE);
CREATE POLICY "public_read_shelters"   ON shelters         FOR SELECT USING (TRUE);
CREATE POLICY "public_read_survivors"   ON survivor_signals FOR SELECT USING (TRUE);
CREATE POLICY "public_read_validations" ON route_validations FOR SELECT USING (TRUE);

-- Escrita: exige role authenticated (Supabase auth.uid())
CREATE POLICY "auth_insert_incidents"  ON incident_reports  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_incidents"  ON incident_reports  FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_shelters"   ON shelters         FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_shelters"    ON shelters         FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_survivors"  ON survivor_signals FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_survivors"   ON survivor_signals FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_validations" ON route_validations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 11. Funções geoespaciais utilitárias --------------------------------------
-- Buscar incidentes ativos dentro de um raio (metros) de um ponto
CREATE OR REPLACE FUNCTION incidents_within_radius(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  type incident_type_enum,
  severity incident_severity_enum,
  location geometry(Point, 4326),
  description TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  verified BOOLEAN,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    i.id,
    i.type,
    i.severity,
    i.location,
    i.description,
    i.upvotes,
    i.downvotes,
    i.verified,
    ST_Distance(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM incident_reports i
  WHERE i.expires_at IS NULL OR i.expires_at > now()
    AND ST_DWithin(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m ASC;
$$;

-- Abrigos próximos
CREATE OR REPLACE FUNCTION shelters_within_radius(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type shelter_type_enum,
  location geometry(Point, 4326),
  capacity_status capacity_status_enum,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.name,
    s.type,
    s.location,
    s.capacity_status,
    ST_Distance(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM shelters s
  WHERE s.is_active = TRUE
    AND ST_DWithin(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m ASC;
$$;

-- Votação social: incrementar upvote / downvote de forma atômica
CREATE OR REPLACE FUNCTION vote_incident(
  p_incident_id UUID,
  p_vote BOOLEAN   -- TRUE = upvote, FALSE = downvote
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_vote THEN
    UPDATE incident_reports SET upvotes = upvotes + 1 WHERE id = p_incident_id;
  ELSE
    UPDATE incident_reports SET downvotes = downvotes + 1 WHERE id = p_incident_id;
  END IF;
END;
$$;

-- Marcar incidente como verificado automaticamente após threshold de upvotes
CREATE OR REPLACE FUNCTION auto_verify_incident()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.upvotes >= 5 AND NEW.downvotes < NEW.upvotes / 2 AND NEW.verified = FALSE THEN
    NEW.verified := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_auto_verify ON incident_reports;
CREATE TRIGGER trg_incidents_auto_verify
  BEFORE UPDATE OF upvotes, downvotes ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION auto_verify_incident();

-- 12. Cron (pg_cron) para limpeza periódica ---------------------------------
-- Requer extensão pg_cron (Supabase: Database → Extensions)
-- Descomente as linhas abaixo após habilitar pg_cron:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'mark-expired-incidents',
--   '*/5 * * * *',                          -- a cada 5 minutos
--   $$SELECT mark_expired_incidents();$$
-- );
-- SELECT cron.schedule(
--   'mark-expired-survivors',
--   '*/10 * * * *',                         -- a cada 10 minutos
--   $$SELECT mark_expired_survivors();$$
-- );

-- 13. Seed inicial (opcional - dados de exemplo) ----------------------------
-- Insira aqui dados reais das prefeituras / Defesa Civil quando disponíveis.
-- Exemplo:
-- INSERT INTO shelters (name, type, location, capacity_total, capacity_status)
-- VALUES (
--   'Ginásio Esportivo Central',
--   'shelter',
--   ST_SetSRID(ST_MakePoint(-46.6333, -23.5505), 4326),
--   500,
--   'available'
-- );

-- ============================================================================
-- Fim da migration 001_postgis_schema.sql
-- ============================================================================
