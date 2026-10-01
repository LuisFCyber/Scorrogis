-- ============================================================================
--  Plataforma Rotas Seguras - Schema Pedido de Ajuda + Validação Comunitária
--  Migration: 003_help_requests.sql
--  Stack alvo: PostgreSQL 15+ com extensão PostGIS habilitada (Supabase)
--  Pré-requisito: executar 001_postgis_schema.sql antes
-- ============================================================================

-- 1. Enums -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE help_category_enum AS ENUM
    ('rescue', 'supplies', 'medical', 'shelter', 'transport');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE help_urgency_enum AS ENUM
    ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE help_status_enum AS ENUM
    ('pending', 'analyzing', 'validated', 'in_progress', 'resolved', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderation_target_enum AS ENUM
    ('help_request', 'validation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderation_reason_enum AS ENUM
    ('fake', 'offensive', 'duplicate', 'outdated', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderation_status_enum AS ENUM
    ('pending', 'reviewed', 'actioned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela: help_requests ---------------------------------------------------
CREATE TABLE IF NOT EXISTS help_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category          help_category_enum   NOT NULL DEFAULT 'rescue',
  urgency           help_urgency_enum    NOT NULL DEFAULT 'medium',
  status            help_status_enum     NOT NULL DEFAULT 'pending',
  location          geometry(Point, 4326) NOT NULL,
  description       TEXT,
  people_count      INTEGER NOT NULL DEFAULT 1 CHECK (people_count > 0),
  vulnerable_groups TEXT[],               -- ['criancas','idosos','gestantes','pcd','outros']
  has_animals       BOOLEAN NOT NULL DEFAULT FALSE,
  animal_count      INTEGER NOT NULL DEFAULT 0,
  animal_description TEXT,
  contact           JSONB,                -- PII: nunca expor em listagens públicas
  photos            TEXT[],               -- URLs (futuro: Supabase Storage)
  validation_count  INTEGER NOT NULL DEFAULT 0,
  deny_count        INTEGER NOT NULL DEFAULT 0,
  community_verified BOOLEAN NOT NULL DEFAULT FALSE,
  official_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  author_token      UUID,                  -- token anônimo p/ autor editar sem login
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_requests_location
  ON help_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_help_requests_category
  ON help_requests (category);
CREATE INDEX IF NOT EXISTS idx_help_requests_urgency
  ON help_requests (urgency);
CREATE INDEX IF NOT EXISTS idx_help_requests_status
  ON help_requests (status);
CREATE INDEX IF NOT EXISTS idx_help_requests_community
  ON help_requests (community_verified) WHERE community_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_help_requests_official
  ON help_requests (official_verified) WHERE official_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_help_requests_expires
  ON help_requests (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_help_requests_author
  ON help_requests (author_token) WHERE author_token IS NOT NULL;

-- 3. Tabela: help_request_validations ----------------------------------------
CREATE TABLE IF NOT EXISTS help_request_validations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id  UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  vote        BOOLEAN NOT NULL,    -- TRUE = confirmo, FALSE = denúncia
  comment     TEXT,
  ip_hash     TEXT,                -- SHA-256 do IP (rate-limit)
  voter_token UUID,                -- token anônimo do navegador (localStorage)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1 voto por pedido por token (evita duplo voto)
  CONSTRAINT uniq_request_voter UNIQUE (request_id, voter_token)
);

CREATE INDEX IF NOT EXISTS idx_help_val_request
  ON help_request_validations (request_id);
CREATE INDEX IF NOT EXISTS idx_help_val_ip
  ON help_request_validations (ip_hash);
CREATE INDEX IF NOT EXISTS idx_help_val_created
  ON help_request_validations (created_at DESC);

-- 4. Tabela: moderation_reports ----------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type    moderation_target_enum NOT NULL,
  target_id      UUID NOT NULL,
  reason         moderation_reason_enum NOT NULL,
  comment        TEXT,
  ip_hash        TEXT,
  reporter_token UUID,
  status         moderation_status_enum NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_target
  ON moderation_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_mod_status
  ON moderation_reports (status);

-- 5. Triggers de updated_at --------------------------------------------------
CREATE OR REPLACE FUNCTION set_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_help_requests_updated ON help_requests;
CREATE TRIGGER trg_help_requests_updated
  BEFORE UPDATE ON help_requests
  FOR EACH ROW EXECUTE FUNCTION set_help_updated_at();

-- 6. Trigger de TTL padrão ---------------------------------------------------
-- Pedidos sem expires_at: 72h padrão (mais longo que incidentes porque pedidos
-- de ajuda podem demorar a ser atendidos)
CREATE OR REPLACE FUNCTION set_help_request_ttl()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '72 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_help_requests_ttl ON help_requests;
CREATE TRIGGER trg_help_requests_ttl
  BEFORE INSERT ON help_requests
  FOR EACH ROW EXECUTE FUNCTION set_help_request_ttl();

-- 7. Trigger: auto-marcar como community_verified após 3 confirmações --------
CREATE OR REPLACE FUNCTION auto_community_verify()
RETURNS TRIGGER AS $$
DECLARE
  confirms INTEGER;
  denies INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vote = TRUE),
    COUNT(*) FILTER (WHERE vote = FALSE)
  INTO confirms, denies
  FROM help_request_validations
  WHERE request_id = NEW.request_id;

  -- Atualiza contadores no pedido
  UPDATE help_requests
     SET validation_count = confirms,
         deny_count = denies,
         community_verified = TRUE
   WHERE id = NEW.request_id
     AND confirms >= 3
     AND denies < confirms / 2
     AND community_verified = FALSE;

  -- Se não atingiu threshold, apenas atualiza contadores
  UPDATE help_requests
     SET validation_count = confirms,
         deny_count = denies
   WHERE id = NEW.request_id
     AND (community_verified = FALSE OR confirms < 3 OR denies >= confirms / 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_help_val_auto_verify ON help_request_validations;
CREATE TRIGGER trg_help_val_auto_verify
  AFTER INSERT OR UPDATE ON help_request_validations
  FOR EACH ROW EXECUTE FUNCTION auto_community_verify();

-- 8. Função: marcar verificado oficialmente (moderador) ---------------------
CREATE OR REPLACE FUNCTION mark_official_verified(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE help_requests
     SET official_verified = TRUE,
         status = CASE WHEN status = 'pending' THEN 'validated' ELSE status END
   WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Row Level Security ------------------------------------------------------
ALTER TABLE help_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_request_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports        ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer um pode ver pedidos e validações)
CREATE POLICY "public_read_help_requests"
  ON help_requests FOR SELECT USING (TRUE);
CREATE POLICY "public_read_help_validations"
  ON help_request_validations FOR SELECT USING (TRUE);

-- Escrita: authenticated (Supabase) ou via API com token
CREATE POLICY "auth_insert_help_requests"
  ON help_requests FOR INSERT
  WITH CHECK (TRUE);  -- permitimos inserção anônima (token gerado pela API)
CREATE POLICY "auth_update_help_requests"
  ON help_requests FOR UPDATE
  USING (author_token IS NOT NULL OR auth.role() = 'authenticated');

CREATE POLICY "auth_insert_help_validations"
  ON help_request_validations FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "auth_insert_moderation_reports"
  ON moderation_reports FOR INSERT
  WITH CHECK (TRUE);

-- 10. Funções geoespaciais ---------------------------------------------------

-- Buscar pedidos dentro de um raio (metros) com filtros opcionais
CREATE OR REPLACE FUNCTION help_requests_within_radius(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 5000,
  p_category help_category_enum DEFAULT NULL,
  p_urgency help_urgency_enum DEFAULT NULL,
  p_status help_status_enum DEFAULT NULL,
  p_only_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  category help_category_enum,
  urgency help_urgency_enum,
  status help_status_enum,
  location geometry(Point, 4326),
  description TEXT,
  people_count INTEGER,
  community_verified BOOLEAN,
  official_verified BOOLEAN,
  validation_count INTEGER,
  deny_count INTEGER,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    h.id,
    h.category,
    h.urgency,
    h.status,
    h.location,
    h.description,
    h.people_count,
    h.community_verified,
    h.official_verified,
    h.validation_count,
    h.deny_count,
    ST_Distance(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM help_requests h
  WHERE (p_category IS NULL OR h.category = p_category)
    AND (p_urgency IS NULL OR h.urgency = p_urgency)
    AND (p_status IS NULL OR h.status = p_status)
    AND (NOT p_only_active OR h.expires_at IS NULL OR h.expires_at > now())
    AND ST_DWithin(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY
    CASE h.urgency
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    distance_m ASC;
$$;

-- Agregação para heatmap (grid de células com contagem e urgência média)
CREATE OR REPLACE FUNCTION help_requests_heatmap_grid(
  p_west DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_north DOUBLE PRECISION,
  p_grid_size DOUBLE PRECISION DEFAULT 0.005,  -- ~500m
  p_category help_category_enum DEFAULT NULL,
  p_urgency help_urgency_enum DEFAULT NULL,
  p_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  cell_lng DOUBLE PRECISION,
  cell_lat DOUBLE PRECISION,
  request_count INTEGER,
  avg_urgency_score DOUBLE PRECISION,
  weighted_intensity DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  WITH bounds AS (
    SELECT ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326) AS geom
  ),
  filtered AS (
    SELECT
      h.location,
      h.urgency,
      h.created_at,
      CASE h.urgency
        WHEN 'critical' THEN 4
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
      END AS urgency_score
    FROM help_requests h
    WHERE (p_category IS NULL OR h.category = p_category)
      AND (p_urgency IS NULL OR h.urgency = p_urgency)
      AND h.created_at > now() - (p_period_hours || ' hours')::INTERVAL
      AND ST_Within(h.location, (SELECT geom FROM bounds))
  ),
  grid AS (
    SELECT
      (floor(ST_X(location) / p_grid_size) * p_grid_size + p_grid_size / 2) AS cell_lng,
      (floor(ST_Y(location) / p_grid_size) * p_grid_size + p_grid_size / 2) AS cell_lat,
      urgency_score
    FROM filtered
  )
  SELECT
    cell_lng,
    cell_lat,
    COUNT(*)::INTEGER AS request_count,
    AVG(urgency_score)::DOUBLE PRECISION AS avg_urgency_score,
    SUM(urgency_score)::DOUBLE PRECISION AS weighted_intensity
  FROM grid
  GROUP BY cell_lng, cell_lat
  ORDER BY weighted_intensity DESC;
$$;

-- ============================================================================
-- Fim da migration 003_help_requests.sql
-- ============================================================================
