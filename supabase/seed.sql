-- seed.sql
-- Seed data for the sports master table

INSERT INTO sports (id, name, slug, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Football', 'football', 'Outdoor football fields and turf for 5-a-side and 7-a-side play.', now(), now()),
  (gen_random_uuid(), 'Cricket', 'cricket', 'Pitches and nets for cricket practice, matches, and informal games.', now(), now()),
  (gen_random_uuid(), 'Basketball', 'basketball', 'Indoor and outdoor basketball courts for pickup games and practice.', now(), now()),
  (gen_random_uuid(), 'Badminton', 'badminton', 'Indoor badminton courts with lighting and nets.', now(), now()),
  (gen_random_uuid(), 'Tennis', 'tennis', 'Hardcourt and clay tennis courts.', now(), now()),
  (gen_random_uuid(), 'Volleyball', 'volleyball', 'Sand and indoor volleyball courts for recreational play.', now(), now()),
  (gen_random_uuid(), 'Hockey', 'hockey', 'Synthetic and turf hockey grounds for hockey matches.', now(), now()),
  (gen_random_uuid(), 'Swimming', 'swimming', 'Pools and aquatic centers for swimming and water sports.', now(), now()),
  (gen_random_uuid(), 'Table Tennis', 'table-tennis', 'Indoor table tennis tables for singles and doubles.', now(), now()),
  (gen_random_uuid(), 'Athletics', 'athletics', 'Tracks and field event spaces for running and training.', now(), now());
