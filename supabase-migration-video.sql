-- ════════════════════════════════════════════════════════════
-- TIMELINE · Migração v4 — Suporte a video por evento
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════

-- ── 1. Colunas na tabela events ───────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_url     TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS media_display TEXT DEFAULT 'image';

-- ── 2. Bucket event-videos (fazer via Dashboard) ──────────
-- Storage → New bucket → nome: "event-videos" → Public → Create
-- (não é possível criar buckets via SQL; usar o Dashboard do Supabase)

-- ── 3. Verificação ────────────────────────────────────────
-- SELECT id, title, video_url, media_display FROM events LIMIT 5;
-- ════════════════════════════════════════════════════════════
