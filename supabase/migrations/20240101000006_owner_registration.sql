-- Add role column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'owner', 'admin'));

-- Seed the admin user (pgcrypto must be enabled — it is from migration 001)
INSERT INTO users (
  username, email, password_hash, name, first_name, last_name,
  role, profile_completed, is_phone_verified
)
VALUES (
  'admin',
  'admin@squadeazy.internal',
  encode(digest('TechCrestal', 'sha256'), 'hex'),
  'Admin',
  'Admin',
  'User',
  'admin',
  true,
  false
)
ON CONFLICT (username) DO NOTHING;

-- Owner registration requests (submitted before admin approval)
CREATE TABLE IF NOT EXISTS owner_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  turf_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER owner_registrations_set_updated_at
BEFORE UPDATE ON owner_registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_owner_reg_status ON owner_registrations(status);
CREATE INDEX IF NOT EXISTS idx_owner_reg_phone ON owner_registrations(phone_number);
