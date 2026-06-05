ALTER TABLE flights ADD COLUMN operating_airline_name TEXT;
ALTER TABLE flights ADD COLUMN operating_airline_iata TEXT;
ALTER TABLE flights ADD COLUMN operating_flight_number TEXT;
ALTER TABLE flights ADD COLUMN scheduled_departure_time TIMESTAMPTZ;
ALTER TABLE flights ADD COLUMN scheduled_arrival_time TIMESTAMPTZ;
