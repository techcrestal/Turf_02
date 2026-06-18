-- Remove price_per_hour from turfs; pricing is now derived from court_time_slots only.
ALTER TABLE turfs DROP COLUMN IF EXISTS price_per_hour;
