-- ════════════════════════════════════════════════════════════
-- TIMELINE SYSTEM — Supabase Schema (Fase 1.2 do PLANO_MESTRE)
-- ════════════════════════════════════════════════════════════
-- Como aplicar:
--   1. Acesse seu projeto no Supabase
--   2. SQL Editor → New query
--   3. Cole TUDO abaixo e clique "Run"
--   4. Conferir em Table Editor que as 5 tabelas foram criadas
-- ════════════════════════════════════════════════════════════

-- TABELA: events (espelho do data.js, fonte de verdade)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date_display TEXT NOT NULL,
  era TEXT NOT NULL,
  track TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  parents TEXT[] NOT NULL DEFAULT '{}',
  importance INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  img_url TEXT,
  img_credit TEXT,
  img_type TEXT DEFAULT 'contributed' CHECK (img_type IN ('ai', 'contributed')),
  quote_text TEXT,
  quote_by TEXT,
  video_id TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: contributions (sugestões da comunidade e da IA)
CREATE TABLE IF NOT EXISTS contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT,
  contributor_name TEXT,
  contributor_email TEXT,
  contribution_type TEXT NOT NULL CHECK (
    contribution_type IN ('edit_text', 'edit_image', 'new_event', 'add_quote', 'fix_date')
  ),
  field_changed TEXT,
  value_before TEXT,
  value_after TEXT,
  full_event_json JSONB,
  source TEXT DEFAULT 'community' CHECK (source IN ('community', 'ai')),
  ai_model TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: event_history (versionamento estilo Wikipedia)
CREATE TABLE IF NOT EXISTS event_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  changed_fields TEXT[],
  change_summary TEXT,
  contribution_id UUID REFERENCES contributions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: page_views (analytics básico)
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT,
  session_id TEXT,
  referrer TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: searches (o que as pessoas buscam)
CREATE TABLE IF NOT EXISTS searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_events_year ON events(year);
CREATE INDEX IF NOT EXISTS idx_events_track ON events(track);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_event ON contributions(event_id);
CREATE INDEX IF NOT EXISTS idx_history_event ON event_history(event_id);
CREATE INDEX IF NOT EXISTS idx_views_event ON page_views(event_id);
CREATE INDEX IF NOT EXISTS idx_views_created ON page_views(created_at);

-- TRIGGER: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS — Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode LER eventos publicados
DROP POLICY IF EXISTS events_public_read ON events;
CREATE POLICY events_public_read ON events
  FOR SELECT USING (is_published = true);

-- Admins (qualquer usuário autenticado) podem fazer tudo
DROP POLICY IF EXISTS events_admin_all ON events;
CREATE POLICY events_admin_all ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Qualquer pessoa pode CRIAR contribuição
DROP POLICY IF EXISTS contributions_public_insert ON contributions;
CREATE POLICY contributions_public_insert ON contributions
  FOR INSERT WITH CHECK (true);

-- Admins leem e atualizam contribuições
DROP POLICY IF EXISTS contributions_admin_read ON contributions;
CREATE POLICY contributions_admin_read ON contributions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS contributions_admin_update ON contributions;
CREATE POLICY contributions_admin_update ON contributions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Histórico: leitura pública, escrita só admin
DROP POLICY IF EXISTS history_public_read ON event_history;
CREATE POLICY history_public_read ON event_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS history_admin_insert ON event_history;
CREATE POLICY history_admin_insert ON event_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Pageviews: insert público, leitura só admin
DROP POLICY IF EXISTS pageviews_public_insert ON page_views;
CREATE POLICY pageviews_public_insert ON page_views
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS pageviews_admin_read ON page_views;
CREATE POLICY pageviews_admin_read ON page_views
  FOR SELECT USING (auth.role() = 'authenticated');

-- Searches: insert público, leitura só admin
DROP POLICY IF EXISTS searches_public_insert ON searches;
CREATE POLICY searches_public_insert ON searches
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS searches_admin_read ON searches;
CREATE POLICY searches_admin_read ON searches
  FOR SELECT USING (auth.role() = 'authenticated');