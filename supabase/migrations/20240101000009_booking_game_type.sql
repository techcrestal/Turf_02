-- Add game_type to bookings (the game_type ENUM already exists from initial_schema.sql)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS game_type game_type NOT NULL DEFAULT 'private';

-- Track participants who join public game bookings
CREATE TABLE IF NOT EXISTS booking_participants (
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_user ON booking_participants (user_id);

-- RLS
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;

-- Users can read participants of their own bookings or bookings they joined
CREATE POLICY "booking_participants_select" ON booking_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  );

-- Users can join public bookings (not their own)
CREATE POLICY "booking_participants_insert" ON booking_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    booking_id IN (SELECT id FROM bookings WHERE game_type = 'public' AND user_id != auth.uid())
  );

-- Users can leave a game they joined
CREATE POLICY "booking_participants_delete" ON booking_participants
  FOR DELETE USING (user_id = auth.uid());
