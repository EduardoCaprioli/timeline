-- ════════════════════════════════════════════════════════════
-- TIMELINE · Migração v2 — Sistema de Domínios
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════

-- ── 1. Tabela de domínios (substitui trilhas hardcoded) ────
CREATE TABLE IF NOT EXISTS domains (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#5cc8b8',
  parent_id    TEXT REFERENCES domains(id) ON DELETE SET NULL,
  sort_order   INTEGER DEFAULT 0,
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domains_select_public"
  ON domains FOR SELECT USING (true);

CREATE POLICY "domains_insert_auth"
  ON domains FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "domains_update_auth"
  ON domains FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "domains_delete_auth"
  ON domains FOR DELETE USING (auth.role() = 'authenticated');

-- ── 2. Novas colunas na tabela events ──────────────────────
-- domain_ids: array com todos os domínios do evento (multi-domínio)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS domain_ids    TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS year_end      INTEGER,
  ADD COLUMN IF NOT EXISTS date_precision TEXT   DEFAULT 'year'
    CHECK (date_precision IN ('millennium','century','decade','year','month','day','approx')),
  ADD COLUMN IF NOT EXISTS region        TEXT,
  ADD COLUMN IF NOT EXISTS source_url    TEXT;

-- ── 3. Seed — domínios raiz (macro-categorias) ─────────────
INSERT INTO domains (id, name, color, sort_order, description) VALUES
  ('tecnologia',  'Tecnologia',           '#5cc8b8', 10, 'Invenções e sistemas tecnológicos que transformaram o mundo'),
  ('ciencia',     'Ciência & Matemática', '#34d399', 20, 'Descobertas científicas, teorias e avanços matemáticos'),
  ('arte',        'Arte & Cultura',       '#fb923c', 30, 'Obras, movimentos, manifestações artísticas e culturais'),
  ('politica',    'Política & Poder',     '#a78bfa', 40, 'Governos, revoluções, tratados e figuras políticas'),
  ('economia',    'Economia & Negócios',  '#fbbf24', 50, 'Mercados, empresas, crises e sistemas econômicos'),
  ('guerra',      'Guerra & Conflito',    '#94a3b8', 60, 'Guerras, batalhas e conflitos que moldaram fronteiras'),
  ('medicina',    'Medicina & Saúde',     '#f87171', 70, 'Descobertas médicas, epidemias, vacinas e saúde pública'),
  ('filosofia',   'Filosofia & Religião', '#67e8f9', 80, 'Pensadores, religiões e sistemas de crenças'),
  ('esporte',     'Esporte & Jogos',      '#4ade80', 90, 'Competições, atletas e a história do esporte'),
  ('sociedade',   'Sociedade & Direitos', '#a3e635', 100, 'Movimentos sociais, direitos humanos e mudanças culturais'),
  ('natureza',    'Natureza & Espaço',    '#86efac', 110, 'Exploração espacial, catástrofes naturais e meio ambiente'),
  ('exploracao',  'Explorações & Geografia', '#e879f9', 120, 'Descobertas geográficas, navegação e cartografia')
ON CONFLICT (id) DO NOTHING;

-- ── 4. Seed — subdomínios de Tecnologia (trilhas atuais) ───
INSERT INTO domains (id, name, color, parent_id, sort_order, description) VALUES
  ('hardware',     'Hardware',                '#f4a261', 'tecnologia', 11, 'Componentes físicos, chips, dispositivos'),
  ('software',     'Software',                '#c084fc', 'tecnologia', 12, 'Sistemas operacionais, linguagens, plataformas'),
  ('ia',           'Inteligência Artificial', '#f472b6', 'tecnologia', 13, 'Machine learning, modelos de linguagem, automação'),
  ('rede',         'Redes & Internet',        '#60a5fa', 'tecnologia', 14, 'Protocolos, infraestrutura e evolução da internet'),
  ('cultura-tech', 'Cultura Digital',         '#5cc8b8', 'tecnologia', 15, 'Games, mídias digitais, comunidades online')
ON CONFLICT (id) DO NOTHING;

-- ── 5. Migrar dados existentes: track → domain_ids ─────────
-- Popula domain_ids com o valor atual de track para todos os eventos
UPDATE events
SET domain_ids = ARRAY[track]
WHERE (domain_ids = '{}' OR domain_ids IS NULL)
  AND track IS NOT NULL
  AND track <> '';

-- ── 6. Índice para queries por domínio ─────────────────────
CREATE INDEX IF NOT EXISTS idx_events_domain_ids
  ON events USING GIN (domain_ids);

-- ════════════════════════════════════════════════════════════
-- Verificação: deve retornar 17 domínios
-- SELECT id, name, parent_id FROM domains ORDER BY sort_order;
-- ════════════════════════════════════════════════════════════
