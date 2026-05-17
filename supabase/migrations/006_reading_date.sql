-- Add optional reading_date to room_readings
-- Allows techs to backdate readings entered after the fact
-- Falls back to created_at when null (existing rows unaffected)
alter table public.room_readings
  add column if not exists reading_date date;
