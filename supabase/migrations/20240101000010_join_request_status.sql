-- Add approval status to booking_participants
ALTER TABLE booking_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Index for quick pending-request lookups
CREATE INDEX IF NOT EXISTS idx_booking_participants_status ON booking_participants (status);
