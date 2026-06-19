-- Admin portal: separate users/sessions, turf settings, manual bookings
-- Note: pgcrypto is pre-installed by Supabase in the 'extensions' schema.
--       Use extensions.crypt() / extensions.gen_salt() explicitly.

-- ─── Portal users ─────────────────────────────────────────────────────────────
CREATE TABLE admin_portal_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('administrator', 'turf_owner')),
  turf_id       UUID        REFERENCES turfs(id) ON DELETE SET NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE admin_portal_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES admin_portal_users(id) ON DELETE CASCADE,
  token      TEXT        UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Per-turf configuration ───────────────────────────────────────────────────
CREATE TABLE turf_settings (
  turf_id                        UUID        PRIMARY KEY REFERENCES turfs(id) ON DELETE CASCADE,
  advance_payment_enabled        BOOLEAN     NOT NULL DEFAULT false,
  advance_payment_type           TEXT        CHECK (advance_payment_type IN ('percentage', 'fixed')),
  advance_payment_value          NUMERIC(10,2),
  cancellation_enabled           BOOLEAN     NOT NULL DEFAULT false,
  cancellation_window_hours      INT         DEFAULT 24,
  cancellation_refund_percentage INT         DEFAULT 100,
  cancellation_notes             TEXT,
  commission_percentage          NUMERIC(5,2) DEFAULT 0,
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by                     UUID        REFERENCES admin_portal_users(id)
);

-- ─── Manual / cash bookings ───────────────────────────────────────────────────
CREATE TABLE manual_bookings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id        UUID        NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
  court_id       UUID        REFERENCES courts(id) ON DELETE SET NULL,
  booking_date   DATE        NOT NULL,
  start_time     TIME        NOT NULL,
  end_time       TIME        NOT NULL,
  customer_name  TEXT        NOT NULL,
  customer_phone TEXT,
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT        NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  notes          TEXT,
  created_by     UUID        REFERENCES admin_portal_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RPCs (SECURITY DEFINER so edge-function service role can call them) ──────

CREATE OR REPLACE FUNCTION verify_admin_password(p_email TEXT, p_password TEXT)
RETURNS TABLE (id UUID, email TEXT, name TEXT, role TEXT, turf_id UUID, is_active BOOLEAN)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, email, name, role, turf_id, is_active
  FROM   admin_portal_users
  WHERE  email         = lower(trim(p_email))
    AND  password_hash = extensions.crypt(p_password, password_hash)
    AND  is_active     = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION create_admin_portal_user(
  p_email TEXT, p_password TEXT, p_name TEXT, p_role TEXT, p_turf_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO admin_portal_users (email, password_hash, name, role, turf_id)
  VALUES (
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    p_name, p_role, p_turf_id
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_admin_portal_password(p_id UUID, p_password TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE admin_portal_users
  SET    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         updated_at    = now()
  WHERE  id = p_id;
$$;

-- ─── RLS: lock tables to service-role only (edge functions bypass RLS) ────────
ALTER TABLE admin_portal_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_bookings       ENABLE ROW LEVEL SECURITY;

-- ─── Default administrator (password: Admin@1234) ─────────────────────────────
INSERT INTO admin_portal_users (email, password_hash, name, role)
VALUES (
  'admin@squadeazy.com',
  extensions.crypt('Admin@1234', extensions.gen_salt('bf', 10)),
  'SquadEazy Admin',
  'administrator'
);
