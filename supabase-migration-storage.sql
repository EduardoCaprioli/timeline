-- ════════════════════════════════════════════════════════════
-- TIMELINE · Migração v5 — Storage buckets + RLS policies
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════

-- ── 1. Criar buckets (idempotente) ────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-videos', 'event-videos', true)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Políticas de Storage — event-images ─────────────────
DROP POLICY IF EXISTS "event-images select public"  ON storage.objects;
DROP POLICY IF EXISTS "event-images insert auth"    ON storage.objects;
DROP POLICY IF EXISTS "event-images update auth"    ON storage.objects;
DROP POLICY IF EXISTS "event-images delete auth"    ON storage.objects;

CREATE POLICY "event-images select public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "event-images insert auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "event-images update auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-images');

CREATE POLICY "event-images delete auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');

-- ── 3. Políticas de Storage — event-videos ─────────────────
DROP POLICY IF EXISTS "event-videos select public"  ON storage.objects;
DROP POLICY IF EXISTS "event-videos insert auth"    ON storage.objects;
DROP POLICY IF EXISTS "event-videos update auth"    ON storage.objects;
DROP POLICY IF EXISTS "event-videos delete auth"    ON storage.objects;

CREATE POLICY "event-videos select public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-videos');

CREATE POLICY "event-videos insert auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-videos');

CREATE POLICY "event-videos update auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-videos');

CREATE POLICY "event-videos delete auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-videos');

-- ── 4. Verificação ────────────────────────────────────────
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('event-images','event-videos');
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
-- ════════════════════════════════════════════════════════════
