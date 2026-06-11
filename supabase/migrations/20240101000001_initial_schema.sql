-- migration_001.sql
-- Initial schema: extensions, enums, tables, indexes, triggers

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enums
CREATE TYPE user_sport_preference AS ENUM ('favorite', 'interested');
CREATE TYPE turf_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE game_type AS ENUM ('private', 'public');
CREATE TYPE game_status AS ENUM ('draft', 'open', 'full', 'closed', 'completed', 'cancelled');
CREATE TYPE player_role AS ENUM ('creator', 'player', 'invitee');
CREATE TYPE player_status AS ENUM ('invited', 'joined', 'declined', 'left');
CREATE TYPE notification_type AS ENUM (
  'booking_confirmation',
  'booking_reminder',
  'game_invitation',
  'game_update',
  'game_full',
  'payment'
);

-- Tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  username TEXT UNIQUE,
  age INT,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_sports (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  preference user_sport_preference NOT NULL DEFAULT 'favorite',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sport_id)
);

CREATE TABLE turfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 1,
  status turf_status NOT NULL DEFAULT 'active',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turf_id UUID NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  booking_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_time, end_time, '[)')) STORED,
  status booking_status NOT NULL DEFAULT 'pending',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_booking_times CHECK (end_time > start_time)
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turf_id UUID NOT NULL REFERENCES turfs(id) ON DELETE RESTRICT,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  type game_type NOT NULL DEFAULT 'public',
  entry_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_players INT NOT NULL CHECK (max_players > 0),
  status game_status NOT NULL DEFAULT 'draft',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  visibility TEXT GENERATED ALWAYS AS (
    CASE
      WHEN type = 'private' THEN 'hidden'
      ELSE 'visible'
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_game_times CHECK (end_time > start_time)
);

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role player_role NOT NULL DEFAULT 'player',
  status player_status NOT NULL DEFAULT 'invited',
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (game_id, user_id)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_payment_reference CHECK (
    booking_id IS NOT NULL OR game_id IS NOT NULL
  )
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sports_set_updated_at
BEFORE UPDATE ON sports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_sports_set_updated_at
BEFORE UPDATE ON user_sports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER turfs_set_updated_at
BEFORE UPDATE ON turfs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER games_set_updated_at
BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER game_players_set_updated_at
BEFORE UPDATE ON game_players
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_turfs_owner_id ON turfs (owner_id);
CREATE INDEX idx_turfs_sport_id ON turfs (sport_id);
CREATE INDEX idx_turfs_status ON turfs (status);
CREATE INDEX idx_turfs_location ON turfs (latitude, longitude);
CREATE INDEX idx_turfs_active ON turfs (id) WHERE deleted_at IS NULL;

CREATE INDEX idx_bookings_user_id ON bookings (user_id);
CREATE INDEX idx_bookings_turf_id ON bookings (turf_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_period ON bookings USING GIST (booking_period);

CREATE INDEX idx_bookings_active ON bookings (id) WHERE deleted_at IS NULL;

CREATE INDEX idx_games_creator_id ON games (creator_id);
CREATE INDEX idx_games_turf_id ON games (turf_id);
CREATE INDEX idx_games_sport_id ON games (sport_id);
CREATE INDEX idx_games_type_status ON games (type, status);
CREATE INDEX idx_games_active ON games (id) WHERE deleted_at IS NULL;

CREATE INDEX idx_game_players_game_id ON game_players (game_id);
CREATE INDEX idx_game_players_user_id ON game_players (user_id);
CREATE INDEX idx_game_players_status ON game_players (status);
CREATE INDEX idx_game_players_active ON game_players (id) WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_user_id ON payments (user_id);
CREATE INDEX idx_payments_booking_id ON payments (booking_id);
CREATE INDEX idx_payments_game_id ON payments (game_id);
CREATE INDEX idx_payments_status ON payments (status);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_active ON notifications (id) WHERE deleted_at IS NULL;

CREATE TABLE otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  used_at timestamptz
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  user_agent text,
  ip_address text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_otp_verifications_phone ON otp_verifications (phone_number);
CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions (token);
CREATE INDEX idx_user_sessions_active ON user_sessions (id) WHERE revoked_at IS NULL;

-- Prevent overlapping bookings per turf
ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING GIST (
    turf_id WITH =,
    booking_period WITH &&
  );
