-- migration_003.sql
-- Add turf contact/timing fields, courts, court_time_slots, turf_photos tables

-- Extend turfs with contact and operating hours
ALTER TABLE turfs ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE turfs ADD COLUMN IF NOT EXISTS turf_email TEXT;
ALTER TABLE turfs ADD COLUMN IF NOT EXISTS opening_time TIME;
ALTER TABLE turfs ADD COLUMN IF NOT EXISTS closing_time TIME;

-- Courts
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id UUID NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT '5-a-side',
  court_type TEXT NOT NULL DEFAULT 'Artificial Turf',
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Court time slots (one row per day-of-week + time window)
CREATE TABLE IF NOT EXISTS court_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_per_slot NUMERIC(10,2) NOT NULL DEFAULT 0,
  slot_duration_minutes INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_times CHECK (end_time > start_time)
);

-- Turf photos
CREATE TABLE IF NOT EXISTS turf_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id UUID NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courts_turf_id ON courts(turf_id);
CREATE INDEX IF NOT EXISTS idx_court_time_slots_court_id ON court_time_slots(court_id);
CREATE INDEX IF NOT EXISTS idx_turf_photos_turf_id ON turf_photos(turf_id);

-- RLS
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_photos ENABLE ROW LEVEL SECURITY;

-- courts policies
CREATE POLICY courts_select_public ON courts
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY courts_insert_owner ON courts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
  );

CREATE POLICY courts_update_owner ON courts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
  );

CREATE POLICY courts_delete_owner ON courts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
  );

-- court_time_slots policies
CREATE POLICY cts_select_public ON court_time_slots
  FOR SELECT USING (true);

CREATE POLICY cts_insert_owner ON court_time_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courts c
      JOIN turfs t ON t.id = c.turf_id
      WHERE c.id = court_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY cts_update_owner ON court_time_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courts c
      JOIN turfs t ON t.id = c.turf_id
      WHERE c.id = court_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY cts_delete_owner ON court_time_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courts c
      JOIN turfs t ON t.id = c.turf_id
      WHERE c.id = court_id AND t.owner_id = auth.uid()
    )
  );

-- turf_photos policies
CREATE POLICY tp_select_public ON turf_photos
  FOR SELECT USING (true);

CREATE POLICY tp_insert_owner ON turf_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
  );

CREATE POLICY tp_delete_owner ON turf_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
  );
