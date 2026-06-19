DO $$
DECLARE
  -- Owner: use ritesh (owner role)
  v_owner  UUID := 'a083a75b-3fce-46b4-a9f2-65a95cfc966e';

  -- Sport IDs (from live DB)
  sp_football   UUID := 'b592861c-47a5-4d83-8732-97f5ec248c62';
  sp_cricket    UUID := '2fd46f11-6155-4d41-a911-12946401ecab';
  sp_badminton  UUID := 'bed85b8b-1a42-4cf7-ac1c-2a38fe6465e2';
  sp_tennis     UUID := 'cff31a60-4125-48d5-83c4-8e84fdf6656f';
  sp_basketball UUID := '917ca096-9476-4b9c-8794-e5abca1fdd8e';

  t UUID; -- working turf id
  c UUID; -- working court id
BEGIN

  -- ── PURGE (keep users & sports) ────────────────────────────────
  DELETE FROM notifications;
  DELETE FROM payments;
  DELETE FROM game_players;
  DELETE FROM games;
  DELETE FROM bookings;
  DELETE FROM court_time_slots;
  DELETE FROM courts;
  DELETE FROM turf_photos;
  DELETE FROM turfs;
  RAISE NOTICE 'Purge done.';

  -- ════════════════════════════════════════════════════════════════
  --  INDORE  ·  Green Field Arena
  --  Football · 07:00–22:00 · varied morning/evening pricing
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_football, 'Green Field Arena',
    'Premium football facility in Vijay Nagar with top-quality artificial grass and floodlights.',
    'Vijay Nagar Square, AB Road', 'Indore', 'Madhya Pradesh', 'India',
    '9812345678', 'greenfield.indore@example.com',
    '07:00', '22:00', 22, 'active', true)
  RETURNING id INTO t;

  -- Court A – 5-a-side · Mon–Fri split pricing, weekend flat
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court A', '5-a-side', 'Artificial Turf', 'High-grip turf, LED floodlit', 0)
  RETURNING id INTO c;
  -- Mon–Fri morning 07:00–14:00 @ ₹700/hr
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '07:00', '14:00', 700, 60 FROM generate_series(1,5) d;
  -- Mon–Fri evening 14:00–22:00 @ ₹1000/hr
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '14:00', '22:00', 1000, 60 FROM generate_series(1,5) d;
  -- Sat–Sun all day @ ₹1200/hr
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  VALUES (c, 0, '07:00', '22:00', 1200, 60), (c, 6, '07:00', '22:00', 1200, 60);

  -- Court B – 7-a-side · all days 10:00–22:00
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court B', '7-a-side', 'Natural Grass', 'Natural grass with sub-surface drainage', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '10:00', '22:00', 2000, 60 FROM generate_series(0,6) d;

  -- ════════════════════════════════════════════════════════════════
  --  BHOPAL  ·  Capital Cricket Ground
  --  Cricket · 06:00–20:00 · 2-hour slots
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_cricket, 'Capital Cricket Ground',
    'Professional cricket ground near DB City Mall with a full-size pitch and practice nets.',
    'Near DB City Mall, Arera Colony', 'Bhopal', 'Madhya Pradesh', 'India',
    '9823456789', 'capital.cricket@example.com',
    '06:00', '20:00', 22, 'active', true)
  RETURNING id INTO t;

  -- Main Pitch – 2-hour sessions
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Main Pitch', 'Standard', 'Natural Grass', 'Full-size cricket pitch with matting overlay', 0)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '20:00', 3000, 120 FROM generate_series(0,6) d;

  -- Practice Net – hourly
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Practice Net 1', 'Standard', 'Indoor', 'Covered practice net for batting & bowling', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '20:00', 800, 60 FROM generate_series(0,6) d;

  -- ════════════════════════════════════════════════════════════════
  --  BHOPAL  ·  Bhopal Badminton Academy
  --  Badminton · 06:00–22:00 · weekday vs weekend pricing
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_badminton, 'Bhopal Badminton Academy',
    'State-of-the-art badminton academy with 2 wooden courts in TT Nagar stadium complex.',
    'TT Nagar Stadium Road', 'Bhopal', 'Madhya Pradesh', 'India',
    '9834567890', 'badminton.bhopal@example.com',
    '06:00', '22:00', 8, 'active', true)
  RETURNING id INTO t;

  -- Court 1 – Doubles · weekday/weekend split
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court 1', 'Doubles', 'Wooden', 'Doubles court — hardwood maple floor', 0)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '22:00', 350, 60 FROM generate_series(1,5) d;     -- weekday ₹350
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  VALUES (c, 0, '06:00', '22:00', 500, 60), (c, 6, '06:00', '22:00', 500, 60); -- weekend ₹500

  -- Court 2 – Singles · flat rate
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court 2', 'Singles', 'Wooden', 'Singles court — hardwood floor', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '22:00', 300, 60 FROM generate_series(0,6) d;

  -- ════════════════════════════════════════════════════════════════
  --  PUNE  ·  Koregaon Sports Park
  --  Football · 07:00–23:00 · morning cheaper, peak evening
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_football, 'Koregaon Sports Park',
    'Multi-court football complex in Koregaon Park. Best artificial turf in Pune.',
    'Lane 6, North Main Road, Koregaon Park', 'Pune', 'Maharashtra', 'India',
    '9845678901', 'koregaon.sports@example.com',
    '07:00', '23:00', 22, 'active', true)
  RETURNING id INTO t;

  -- Court A – 5-a-side · morning/evening split all days
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court A', '5-a-side', 'Artificial Turf', 'Premium FIFA-grade turf, fully floodlit', 0)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '07:00', '12:00', 800, 60 FROM generate_series(0,6) d;     -- morning ₹800
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '12:00', '23:00', 1200, 60 FROM generate_series(0,6) d;    -- peak ₹1200

  -- Court B – 11-a-side · weekends only
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court B', '11-a-side', 'Natural Grass', 'Full-size natural grass field. Weekends only.', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  VALUES (c, 0, '08:00', '20:00', 5000, 60), (c, 6, '08:00', '20:00', 5000, 60);

  -- ════════════════════════════════════════════════════════════════
  --  PUNE  ·  Aundh Tennis Club
  --  Tennis · 06:00–20:00 · 30-minute slots
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_tennis, 'Aundh Tennis Club',
    'Professional clay and hard-surface tennis courts in Aundh. 30-minute bookable slots.',
    'Parihar Chowk, Aundh', 'Pune', 'Maharashtra', 'India',
    '9856789012', 'tennis.aundh@example.com',
    '06:00', '20:00', 4, 'active', true)
  RETURNING id INTO t;

  -- Court 1 – Singles Clay · 30-min slots
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court 1', 'Singles', 'Clay', 'Clay surface singles court — soft on joints', 0)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '20:00', 700, 30 FROM generate_series(0,6) d;

  -- Court 2 – Doubles Hard Court · 30-min, weekday/weekend split
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court 2', 'Doubles', 'Hard Court', 'Hard acrylic surface doubles court', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '20:00', 600, 30 FROM generate_series(1,5) d;     -- weekday ₹600/30min
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  VALUES (c, 0, '06:00', '20:00', 900, 30), (c, 6, '06:00', '20:00', 900, 30); -- weekend ₹900/30min

  -- ════════════════════════════════════════════════════════════════
  --  MUMBAI  ·  Andheri 24/7 Sports Hub
  --  Football · 00:00–23:00 · night discount, peak evening
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_football, 'Andheri 24/7 Sports Hub',
    'Mumbai''s only round-the-clock football facility. Book midnight sessions at half the price!',
    'Marol Naka, Andheri East', 'Mumbai', 'Maharashtra', 'India',
    '9867890123', 'andheri247@example.com',
    '00:00', '23:00', 22, 'active', true)
  RETURNING id INTO t;

  -- Court A – three-tier pricing (night cheap, day normal, peak expensive)
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court A', '5-a-side', 'Artificial Turf', 'Fully floodlit, available around the clock', 0)
  RETURNING id INTO c;
  -- Night 00:00–06:00 @ ₹1200/hr
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '00:00', '06:00', 1200, 60 FROM generate_series(0,6) d;
  -- Day 06:00–18:00 @ ₹2200/hr
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '06:00', '18:00', 2200, 60 FROM generate_series(0,6) d;
  -- Peak evening 18:00–23:00 @ ₹3500/hr
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '18:00', '23:00', 3500, 60 FROM generate_series(0,6) d;

  -- Court B – day/evening only
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court B', '5-a-side', 'Artificial Turf', 'Day/evening court — identical spec to Court A', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '08:00', '23:00', 2800, 60 FROM generate_series(0,6) d;

  -- ════════════════════════════════════════════════════════════════
  --  MUMBAI  ·  Bandra Sports Hub
  --  Basketball · 07:00–22:00 · 90-min slots
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO turfs (owner_id, sport_id, name, description, address, city, state, country,
    contact_number, turf_email, opening_time, closing_time, capacity, status, is_public)
  VALUES (v_owner, sp_basketball, 'Bandra Sports Hub',
    'Full-size indoor basketball courts in Bandra West. 90-minute game sessions.',
    'Turner Road, Bandra West', 'Mumbai', 'Maharashtra', 'India',
    '9878901234', 'bandra.sports@example.com',
    '07:00', '22:00', 10, 'active', true)
  RETURNING id INTO t;

  -- Court 1 – all days 07:00–22:00, 90-min slots
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court 1', 'Standard', 'Wooden', 'Full-size hardwood basketball court', 0)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  SELECT c, d, '07:00', '22:00', 2000, 90 FROM generate_series(0,6) d;

  -- Court 2 – weekends 09:00–21:00, 90-min slots, premium
  INSERT INTO courts (turf_id, name, size, court_type, description, sort_order)
  VALUES (t, 'Court 2', 'Standard', 'Wooden', 'Second full-size court — weekends only', 1)
  RETURNING id INTO c;
  INSERT INTO court_time_slots (court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
  VALUES (c, 0, '09:00', '21:00', 2500, 90), (c, 6, '09:00', '21:00', 2500, 90);

  RAISE NOTICE 'Done. 7 turfs, 14 courts seeded across Indore, Bhopal, Pune, Mumbai.';
END $$;
