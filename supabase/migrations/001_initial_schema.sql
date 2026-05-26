-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TRIPS ───────────────────────────────────────────────────────────────────
CREATE TABLE trips (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  cover_emoji   TEXT DEFAULT '✈️',
  start_date    DATE,
  end_date      DATE,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  share_token   TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FLIGHTS ─────────────────────────────────────────────────────────────────
CREATE TABLE flights (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id                UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  airline_name           TEXT NOT NULL,
  airline_iata           TEXT,
  flight_number          TEXT,
  departure_airport_code TEXT NOT NULL,
  departure_airport_name TEXT,
  arrival_airport_code   TEXT NOT NULL,
  arrival_airport_name   TEXT,
  departure_time         TIMESTAMPTZ NOT NULL,
  arrival_time           TIMESTAMPTZ NOT NULL,
  flight_class           TEXT,
  aircraft_type          TEXT,
  booking_reference      TEXT,
  status                 TEXT NOT NULL DEFAULT 'scheduled',
  layovers               JSONB,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HOTELS ──────────────────────────────────────────────────────────────────
CREATE TABLE hotels (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_name          TEXT NOT NULL,
  address             TEXT,
  city                TEXT,
  country             TEXT,
  check_in_date       DATE NOT NULL,
  check_out_date      DATE NOT NULL,
  room_type           TEXT,
  booking_reference   TEXT,
  confirmation_number TEXT,
  price_per_night     NUMERIC(10, 2),
  total_price         NUMERIC(10, 2),
  currency            TEXT DEFAULT 'USD',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CAR RENTALS ─────────────────────────────────────────────────────────────
CREATE TABLE car_rentals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name      TEXT NOT NULL,
  car_type          TEXT,
  pickup_location   TEXT,
  dropoff_location  TEXT,
  pickup_date       DATE NOT NULL,
  dropoff_date      DATE NOT NULL,
  booking_reference TEXT,
  total_price       NUMERIC(10, 2),
  currency          TEXT DEFAULT 'USD',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUTO-UPDATE updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at    BEFORE UPDATE ON trips        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER flights_updated_at  BEFORE UPDATE ON flights      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER hotels_updated_at   BEFORE UPDATE ON hotels       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cars_updated_at     BEFORE UPDATE ON car_rentals  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE trips       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rentals ENABLE ROW LEVEL SECURITY;

-- Trips: owner has full access; public trips are readable by anyone
CREATE POLICY "trips_owner_all"   ON trips FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "trips_public_read" ON trips FOR SELECT  USING (is_public = TRUE);

-- Flights: owner full access; public read if parent trip is public
CREATE POLICY "flights_owner_all"   ON flights FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "flights_public_read" ON flights FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = flights.trip_id AND trips.is_public = TRUE)
);

-- Hotels: owner full access; public read if parent trip is public
CREATE POLICY "hotels_owner_all"   ON hotels FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "hotels_public_read" ON hotels FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = hotels.trip_id AND trips.is_public = TRUE)
);

-- Car rentals: owner full access; public read if parent trip is public
CREATE POLICY "cars_owner_all"   ON car_rentals FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "cars_public_read" ON car_rentals FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = car_rentals.trip_id AND trips.is_public = TRUE)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_trips_user_id      ON trips(user_id);
CREATE INDEX idx_trips_share_token  ON trips(share_token);
CREATE INDEX idx_flights_trip_id    ON flights(trip_id);
CREATE INDEX idx_flights_departure  ON flights(departure_time);
CREATE INDEX idx_hotels_trip_id     ON hotels(trip_id);
CREATE INDEX idx_cars_trip_id       ON car_rentals(trip_id);
