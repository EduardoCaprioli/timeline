-- ════════════════════════════════════════════════════════════
-- TIMELINE · Fix — constraint events_img_type_check
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════

-- Remove o constraint antigo e recria com mais valores permitidos
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_img_type_check;

ALTER TABLE events ADD CONSTRAINT events_img_type_check
  CHECK (img_type IN ('ai', 'photo', 'manual', 'illustration', 'map', 'diagram', 'screenshot'));

-- Verificação
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'events_img_type_check';
-- ════════════════════════════════════════════════════════════
