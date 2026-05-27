import { supabase } from './supabase'

export interface FlightLookupResult {
  airline_iata: string | null
  airline_name: string | null
  flight_number: string | null
  departure_airport_code: string | null
  departure_airport_name: string | null
  departure_time: string | null
  departure_time_local: string | null
  departure_date: string | null
  departure_terminal: string | null
  departure_gate: string | null
  arrival_airport_code: string | null
  arrival_airport_name: string | null
  arrival_time: string | null
  arrival_time_local: string | null
  arrival_date: string | null
  arrival_terminal: string | null
  arrival_gate: string | null
  arrival_baggage: string | null
  aircraft_type: string | null
  status: string | null
  duration_minutes: number | null
}

export async function lookupFlight(
  airlineIata: string,
  flightNumber: string,
  departureDate?: string
): Promise<FlightLookupResult> {
  const { data, error } = await supabase.functions.invoke('lookup-flight', {
    body: { airline_iata: airlineIata, flight_number: flightNumber, departure_date: departureDate ?? null },
  })

  if (error) throw new Error(error.message ?? 'Lookup failed')
  if (data.error) throw new Error(data.error)

  return data as FlightLookupResult
}

export function parseFlightNumber(input: string): { airline: string; number: string } | null {
  const match = input.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
  if (!match) return null
  return { airline: match[1].toUpperCase(), number: match[2] }
}
