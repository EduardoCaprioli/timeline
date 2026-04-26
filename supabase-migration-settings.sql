-- ════════════════════════════════════════════════════════════
-- TIMELINE · Migração v3 — Tabela de Configurações
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════

-- ── 1. Tabela de configurações (chave/valor JSONB) ─────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública (o front-end lê para saber se IA está ativa)
CREATE POLICY "settings_select_public"
  ON settings FOR SELECT USING (true);

-- Escrita apenas para autenticados (admin)
CREATE POLICY "settings_insert_auth"
  ON settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "settings_update_auth"
  ON settings FOR UPDATE USING (auth.role() = 'authenticated');

-- ── 2. Valores iniciais ────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('ai_images_enabled', 'true'),
  ('ai_images_model',   '"flux"'),
  ('ai_video_enabled',  'false')
ON CONFLICT (key) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- Verificação: deve retornar 3 linhas
-- SELECT key, value FROM settings;
-- ════════════════════════════════════════════════════════════
