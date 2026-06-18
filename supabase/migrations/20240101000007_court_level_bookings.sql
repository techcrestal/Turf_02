-- migration_007.sql
-- Move bookings from turf-level to court-level
-- Adds court_id to bookings, swaps the overlap exclusion constraint to be per-court

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES courts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings (court_id);

-- Drop old turf-level overlap constraint if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT no_overlapping_bookings;
  END IF;
END$$;

-- Add court-level overlap constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_court_bookings'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT no_overlapping_court_bookings
      EXCLUDE USING GIST (
        court_id WITH =,
        booking_period WITH &&
      )
      WHERE (court_id IS NOT NULL);
  END IF;
END$$;
