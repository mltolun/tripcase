import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ─── Parse CLI args ──────────────────────────────────────────────────────────
const userId = process.argv.find(a => a.startsWith('--userId='))?.split('=')[1]
  ?? process.env.SUPABASE_USER_ID

if (!userId) {
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-tripcase-data.mjs --userId=<your-supabase-auth-uuid>')
  console.error('  Or set SUPABASE_USER_ID env var')
  process.exit(1)
}

// ─── Load data ───────────────────────────────────────────────────────────────
const dataPath = resolve(__dirname, '..', 'all-trips.json')
if (!existsSync(dataPath)) {
  console.error('all-trips.json not found')
  process.exit(1)
}

const rawTrips = JSON.parse(readFileSync(dataPath, 'utf-8')).trips
console.log(`Found ${rawTrips.length} trip(s) in all-trips.json\n`)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusFromCode(code) {
  const map = { S: 'scheduled', L: 'landed', A: 'active', C: 'cancelled', D: 'diverted', U: 'unknown' }
  return map[code] ?? 'unknown'
}

function safeStr(v) { return v == null || v === '' ? null : String(v) }

function flightNumberStr(flight) {
  if (!flight.flight_number) return null
  const code = flight.airline?.iata_code ?? ''
  const num = String(flight.flight_number)
  return `${code}${num}`
}

function aircraftType(flight) {
  if (!flight.aircraft?.description) return null
  const desc = flight.aircraft.description
  const code = flight.aircraft.iata_code
  return code ? `${code} ${desc}` : desc
}

function formatAddress(item) {
  const h = item.hotel_reservation?.hotel_property
  if (!h) return null
  return [h.address?.street1, h.address?.postal_code, h.address?.city].filter(Boolean).join(', ') || null
}

function checkInDate(item) {
  if (item.hotel_reservation?.start_date) return item.hotel_reservation.start_date.slice(0, 10)
  return item.start_time?.utc_time?.slice(0, 10) ?? null
}

function checkOutDate(item) {
  if (item.hotel_reservation?.end_date) return item.hotel_reservation.end_date.slice(0, 10)
  return item.end_time?.utc_time?.slice(0, 10) ?? null
}

// ─── Import ──────────────────────────────────────────────────────────────────
let tripCount = 0, flightCount = 0, hotelCount = 0, carCount = 0, skipped = 0

const targetTripCaseUserId = '2260622' // Martin Luna (martin.luna@gmail.com)
const filtered = rawTrips.filter(t => t.user_id === targetTripCaseUserId)
console.log(`Filtered to ${filtered.length} trip(s) for TripCase user ${targetTripCaseUserId} (out of ${rawTrips.length} total)\n`)

for (const trip of filtered) {
  const details = trip.details ?? trip
  const items = details.items ?? []

  // Create the trip
  const tripInsert = {
    user_id: userId,
    name: trip.name,
    description: trip.destination ? `Trip to ${trip.destination}` : null,
    start_date: trip.start_time_utc?.slice(0, 10) ?? null,
    end_date: trip.end_time_utc?.slice(0, 10) ?? null,
    is_public: false,
  }

  const { data: newTrip, error: tripErr } = await supabase
    .from('trips')
    .insert(tripInsert)
    .select('id')
    .single()

  if (tripErr) {
    console.error(`  Error creating trip "${trip.name}": ${tripErr.message}`)
    skipped++
    continue
  }

  const tripId = newTrip.id
  tripCount++
  console.log(`✓ Trip: "${trip.name}" (${trip.destination || ''})`)

  // Process items
  for (const item of items) {
    switch (item.type) {
      case 'Air': {
        const flight = item.air_reservation?.flight
        if (!flight) {
          console.log(`  ⚠ Skipping Air item ${item.id} (no flight data)`)
          continue
        }

        const depTime = item.start_time?.utc_time
        const arrTime = item.end_time?.utc_time
        if (!depTime || !arrTime) {
          console.log(`  ⚠ Skipping flight ${flight.flight_number} (missing times)`)
          continue
        }

        const flightInsert = {
          trip_id: tripId,
          user_id: userId,
          airline_name: flight.airline?.name ?? 'Unknown',
          airline_iata: flight.airline?.iata_code ?? null,
          flight_number: flightNumberStr(flight),
          departure_airport_code: flight.departure_airport?.iata_code ?? '???',
          departure_airport_name: flight.departure_airport?.name ?? null,
          arrival_airport_code: flight.arrival_airport?.iata_code ?? '???',
          arrival_airport_name: flight.arrival_airport?.name ?? null,
          departure_time: depTime,
          arrival_time: arrTime,
          scheduled_departure_time: depTime,
          scheduled_arrival_time: arrTime,
          duration_minutes: flight.sched_duration ?? null,
          departure_terminal: safeStr(flight.departure_terminal),
          departure_gate: safeStr(flight.departure_gate),
          arrival_terminal: safeStr(flight.arrival_terminal),
          arrival_gate: safeStr(flight.arrival_gate),
          arrival_baggage: safeStr(flight.baggage_claim),
          aircraft_type: aircraftType(flight),
          booking_reference: safeStr(item.air_reservation?.reservation_number),
          status: statusFromCode(flight.status_code),
          notes: safeStr(item.note) || null,
        }

        const { error: fErr } = await supabase.from('flights').insert(flightInsert)
        if (fErr) {
          console.log(`  ✗ Flight ${flightInsert.flight_number}: ${fErr.message}`)
        } else {
          flightCount++
          console.log(`  ✓ Flight: ${flightInsert.departure_airport_code} → ${flightInsert.arrival_airport_code} (${flightInsert.flight_number || 'N/A'})`)
        }
        break
      }

      case 'Hotel': {
        const hotel = item.hotel_reservation?.hotel_property
        if (!hotel) {
          console.log(`  ⚠ Skipping Hotel item ${item.id} (no hotel data)`)
          continue
        }

        const cin = checkInDate(item)
        const cout = checkOutDate(item)
        if (!cin || !cout) {
          console.log(`  ⚠ Skipping hotel "${hotel.name}" (missing dates)`)
          continue
        }

        const hotelInsert = {
          trip_id: tripId,
          user_id: userId,
          hotel_name: hotel.name ?? 'Unknown',
          address: formatAddress(item),
          city: hotel.address?.city ?? null,
          country: hotel.address?.country_name ?? null,
          check_in_date: cin,
          check_out_date: cout,
          booking_reference: null,
          confirmation_number: safeStr(item.hotel_reservation?.confirmation_number),
          notes: safeStr(item.note) || null,
        }

        const { error: hErr } = await supabase.from('hotels').insert(hotelInsert)
        if (hErr) {
          console.log(`  ✗ Hotel "${hotelInsert.hotel_name}": ${hErr.message}`)
        } else {
          hotelCount++
          console.log(`  ✓ Hotel: ${hotelInsert.hotel_name} (${cin} → ${cout})`)
        }
        break
      }

      case 'Vehicle': {
        const veh = item.vehicle_reservation
        if (!veh) {
          console.log(`  ⚠ Skipping Vehicle item ${item.id} (no vehicle data)`)
          continue
        }

        const pickupDate = item.start_time?.utc_time?.slice(0, 10)
        const dropoffDate = item.end_time?.utc_time?.slice(0, 10)
        if (!pickupDate || !dropoffDate) {
          console.log(`  ⚠ Skipping car rental "${veh.vendor?.name}" (missing dates)`)
          continue
        }

        const locAddr = veh.pickup_location?.vehicle_location?.address
        const pickupLoc = locAddr
          ? [locAddr.city, locAddr.postal_code, locAddr.country_name].filter(Boolean).join(', ')
          : null

        const carInsert = {
          trip_id: tripId,
          user_id: userId,
          company_name: veh.vendor?.name ?? 'Unknown',
          car_type: safeStr(veh.vehicle_desc) || null,
          pickup_location: pickupLoc,
          dropoff_location: pickupLoc,
          pickup_date: pickupDate,
          dropoff_date: dropoffDate,
          booking_reference: safeStr(veh.confirmation_code),
        }

        const { error: cErr } = await supabase.from('car_rentals').insert(carInsert)
        if (cErr) {
          console.log(`  ✗ Car "${carInsert.company_name}": ${cErr.message}`)
        } else {
          carCount++
          console.log(`  ✓ Car: ${carInsert.company_name} (${pickupDate} → ${dropoffDate})`)
        }
        break
      }

      default:
        // Skip Generic (rail) and other types
        break
    }
  }
}

console.log(`\nDone! Created ${tripCount} trip(s), ${flightCount} flight(s), ${hotelCount} hotel(s), ${carCount} car rental(s)`)
if (skipped) console.log(`${skipped} trip(s) skipped due to errors`)
