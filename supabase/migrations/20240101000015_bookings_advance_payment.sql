-- Advance payment tracking for bookings

-- Add 'partial' payment status for when only advance amount is paid
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'partial';

-- Add advance payment columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS advance_amount   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(10,2);
