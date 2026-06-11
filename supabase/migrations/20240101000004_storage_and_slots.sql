-- Add is_available to court_time_slots (was referenced in edge function but missing from schema)
ALTER TABLE court_time_slots ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

-- Create turf-photos storage bucket (public so URLs work without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('turf-photos', 'turf-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for turf-photos
DROP POLICY IF EXISTS "turf_photos_insert" ON storage.objects;
CREATE POLICY "turf_photos_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'turf-photos');

DROP POLICY IF EXISTS "turf_photos_select" ON storage.objects;
CREATE POLICY "turf_photos_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'turf-photos');

DROP POLICY IF EXISTS "turf_photos_delete" ON storage.objects;
CREATE POLICY "turf_photos_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'turf-photos');
