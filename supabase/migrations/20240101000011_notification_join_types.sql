-- Add join-related notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'join_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'join_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'join_rejected';

-- Add expiry column for 1-day-after-game cleanup policy
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at
  ON notifications (expires_at)
  WHERE expires_at IS NOT NULL;
