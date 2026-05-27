export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TripInsert = {
  user_id: string
  name: string
  description?: string | null
  cover_emoji?: string | null
  cover_image_url?: string | null
  start_date?: string | null
  end_date?: string | null
  is_public?: boolean
  share_token?: string
}

export type TripUpdate = Partial<TripInsert>

export type FlightInsert = {
  trip_id: string
  user_id: string
  airline_name: string
  airline_iata?: string | null
  flight_number?: string | null
  departure_airport_code: string
  departure_airport_name?: string | null
  arrival_airport_code: string
  arrival_airport_name?: string | null
  departure_time: string
  arrival_time: string
  duration_minutes?: number | null
  departure_terminal?: string | null
  departure_gate?: string | null
  arrival_terminal?: string | null
  arrival_gate?: string | null
  arrival_baggage?: string | null
  flight_class?: string | null
  aircraft_type?: string | null
  booking_reference?: string | null
  status?: string
  layovers?: Json | null
  notes?: string | null
}

export type HotelInsert = {
  trip_id: string
  user_id: string
  hotel_name: string
  address?: string | null
  city?: string | null
  country?: string | null
  check_in_date: string
  check_out_date: string
  room_type?: string | null
  booking_reference?: string | null
  confirmation_number?: string | null
  price_per_night?: number | null
  total_price?: number | null
  currency?: string | null
  notes?: string | null
}

export type CarRentalInsert = {
  trip_id: string
  user_id: string
  company_name: string
  car_type?: string | null
  pickup_location?: string | null
  dropoff_location?: string | null
  pickup_date: string
  dropoff_date: string
  booking_reference?: string | null
  total_price?: number | null
  currency?: string | null
  notes?: string | null
}

export interface Trip {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_emoji: string | null
  cover_image_url: string | null
  start_date: string | null
  end_date: string | null
  is_public: boolean
  share_token: string
  created_at: string
  updated_at: string
}

export interface Flight {
  id: string
  trip_id: string
  user_id: string
  airline_name: string
  airline_iata: string | null
  flight_number: string | null
  departure_airport_code: string
  departure_airport_name: string | null
  arrival_airport_code: string
  arrival_airport_name: string | null
  departure_time: string
  arrival_time: string
  duration_minutes: number | null
  departure_terminal: string | null
  departure_gate: string | null
  arrival_terminal: string | null
  arrival_gate: string | null
  arrival_baggage: string | null
  flight_class: string | null
  aircraft_type: string | null
  booking_reference: string | null
  status: string
  layovers: Json | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Hotel {
  id: string
  trip_id: string
  user_id: string
  hotel_name: string
  address: string | null
  city: string | null
  country: string | null
  check_in_date: string
  check_out_date: string
  room_type: string | null
  booking_reference: string | null
  confirmation_number: string | null
  price_per_night: number | null
  total_price: number | null
  currency: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CarRental {
  id: string
  trip_id: string
  user_id: string
  company_name: string
  car_type: string | null
  pickup_location: string | null
  dropoff_location: string | null
  pickup_date: string
  dropoff_date: string
  booking_reference: string | null
  total_price: number | null
  currency: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Layover = {
  airport_code: string
  airport_name?: string
  duration_minutes: number
}
