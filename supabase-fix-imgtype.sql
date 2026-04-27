-- ════════════════════════════════════════════════════════════
-- TIMELINE · Fix — constraint events_img_type_check
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════

-- Remove o constraint (img_type é só metadado de exibição,
-- não precisa de validação rígida no banco)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_img_type_check;

-- Verificação: deve retornar 0 linhas
-- SELECT conname FROM pg_constraint WHERE conname = 'events_img_type_check';
-- ════════════════════════════════════════════════════════════
