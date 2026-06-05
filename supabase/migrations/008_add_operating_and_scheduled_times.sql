ALTER TABLE flights ADD COLUMN IF NOT EXISTS operating_airline_name TEXT;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS operating_airline_iata TEXT;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS operating_flight_number TEXT;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS scheduled_departure_time TIMESTAMPTZ;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS scheduled_arrival_time TIMESTAMPTZ;
