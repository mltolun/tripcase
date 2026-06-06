import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: { transport: WebSocket },
})

const AIRPORT_TZ = {
  JFK: 'America/New_York', LGA: 'America/New_York', EWR: 'America/New_York',
  BOS: 'America/New_York', DCA: 'America/New_York', IAD: 'America/New_York',
  PHL: 'America/New_York', CLT: 'America/New_York', ATL: 'America/New_York',
  MIA: 'America/New_York', TPA: 'America/New_York', MCO: 'America/New_York',
  DTW: 'America/New_York', ORD: 'America/Chicago', MDW: 'America/Chicago',
  DFW: 'America/Chicago', IAH: 'America/Chicago', MSP: 'America/Chicago',
  DEN: 'America/Denver', PHX: 'America/Phoenix', SLC: 'America/Denver',
  SEA: 'America/Los_Angeles', PDX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles', LAX: 'America/Los_Angeles', SAN: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles', HNL: 'Pacific/Honolulu', SJD: 'America/Mazatlan',
  LHR: 'Europe/London', LGW: 'Europe/London', CDG: 'Europe/Paris',
  AMS: 'Europe/Amsterdam', FRA: 'Europe/Berlin', MUC: 'Europe/Berlin',
  FCO: 'Europe/Rome', MXP: 'Europe/Rome', BCN: 'Europe/Madrid',
  MAD: 'Europe/Madrid', ZRH: 'Europe/Zurich', VIE: 'Europe/Vienna',
  CPH: 'Europe/Copenhagen', ARN: 'Europe/Stockholm', OSL: 'Europe/Oslo',
  HEL: 'Europe/Helsinki', DUB: 'Europe/Dublin', BRU: 'Europe/Brussels',
  LIS: 'Europe/Lisbon', ATH: 'Europe/Athens', IST: 'Europe/Istanbul',
  HND: 'Asia/Tokyo', NRT: 'Asia/Tokyo', ICN: 'Asia/Seoul',
  PVG: 'Asia/Shanghai', PEK: 'Asia/Shanghai', HKG: 'Asia/Hong_Kong',
  SIN: 'Asia/Singapore', BKK: 'Asia/Bangkok', DEL: 'Asia/Kolkata',
  BOM: 'Asia/Kolkata', DXB: 'Asia/Dubai',
  SYD: 'Australia/Sydney', MEL: 'Australia/Sydney', AKL: 'Pacific/Auckland',
}

function getAirportOffset(airportCode, date) {
  const tzName = AIRPORT_TZ[airportCode]
  if (!tzName) return 0
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tzName, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date)
  const get = (t) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  return (utcMs - localMs) / 60000
}

function localToUtc(localIso, airportCode) {
  if (!localIso) return null
  const hasTz = /[Zz]|[+-]\d{2}:\d{2}$/.test(localIso)
  const isZeroOffset = /[+-]00:00$/.test(localIso)
  const d = new Date(hasTz ? localIso : localIso + 'Z')
  if ((hasTz && !isZeroOffset) || !airportCode || isNaN(d.getTime())) return d.toISOString()
  const offset = getAirportOffset(airportCode, d)
  return new Date(d.getTime() + offset * 60000).toISOString()
}

function parseScheduledTime(scheduledStr, airportCode, fallbackDate) {
  if (!scheduledStr || !airportCode) return null
  const m = scheduledStr.match(/^(\d{2}:\d{2}),\s*(\w{3})\s*(\d{1,2})$/)
  if (!m) return null
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const month = months[m[2].toLowerCase().slice(0, 3)]
  if (month === undefined) return null
  const year = new Date(fallbackDate + 'T00:00:00').getFullYear()
  const localIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(parseInt(m[3], 10)).padStart(2, '0')}T${m[1]}:00`
  return localToUtc(localIso, airportCode)
}

async function lookupFlightView(airline, number, departureDate) {
  const url = `https://app-api.flightview.com/api/v2/flight/${airline}/${number}?departureDate=${departureDate}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-GB',
      'Referer': `https://www.flightview.com/flight-tracker/${airline}/${number}?date=${departureDate}`,
      'Origin': 'https://www.flightview.com',
    }
  })
  if (!response.ok) return null
  const data = await response.json()
  if (data.emptyResults || !data.flight) return null
  return data.flight
}

const statusMap = {
  Scheduled: 'scheduled',
  Active: 'active',
  'In Air': 'in air',
  EnRoute: 'en route',
  Departed: 'departed',
  Approaching: 'approaching',
  Landed: 'landed',
  Arrived: 'landed',
  Delayed: 'delayed',
  Cancelled: 'cancelled',
  Canceled: 'cancelled',
  Diverted: 'diverted',
  Unknown: 'unknown',
}

async function main() {
  const now = new Date()
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000)

  const { data: flights, error } = await supabase
    .from('flights')
    .select('id, flight_number, departure_time, arrival_time, status')
    .or(
      // Upcoming flights departing within the next 4 hours
      `and(departure_time.gte.${now.toISOString()},departure_time.lte.${in4h.toISOString()}),` +
      // In-air flights that have departed but not yet arrived
      `and(departure_time.lt.${now.toISOString()},arrival_time.gte.${now.toISOString()}),` +
      // Recently landed flights (within the last 4 hours) — captures post-landing data
      `and(arrival_time.gte.${since4h.toISOString()},arrival_time.lt.${now.toISOString()})`
    )
    .not('status', 'in', '("cancelled")')
    .not('flight_number', 'is', null)

  if (error) {
    console.error('Query error:', error)
    process.exit(1)
  }

  if (!flights?.length) {
    console.log('No flights to check')
    return
  }

  console.log(`Checking ${flights.length} flight(s)...`)

  let checked = 0
  for (const flight of flights) {
    try {
      const match = flight.flight_number.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
      if (!match) continue

      const airline = match[1].toUpperCase()
      const number = match[2]
      const date = flight.departure_time.slice(0, 10)

      const fvFlight = await lookupFlightView(airline, number, date)
      if (!fvFlight) {
        console.log(`  ${flight.flight_number}: no data from FlightView`)
        continue
      }

      const rawStatus = fvFlight.flightStatus ?? 'Scheduled'
      const status = statusMap[rawStatus] ?? 'unknown'

      const dep = fvFlight.departure ?? {}
      const arr = fvFlight.arrival ?? {}

      const departureTime = localToUtc(dep.departureDateTime ?? null, dep.airportCode ?? null)
      const arrivalTime = localToUtc(arr.arrivalDateTime ?? null, arr.airportCode ?? null)
      const scheduledDep = parseScheduledTime(dep.scheduledTime, dep.airportCode ?? null, date)
      const scheduledArr = parseScheduledTime(arr.scheduledTime, arr.airportCode ?? null, date)

      // Parse operating airline from titles.sub ("Operated by British Airways (BA) 273")
      // Fall back to titles.main ("Iberia (IB) 3616") if sub has no operated-by info
      const mainTitle = fvFlight.titles?.main ?? ''
      const subTitle = fvFlight.titles?.sub ?? ''
      let operatingName = null
      let operatingIata = null
      let operatingFlightNumber = null

      const operatedMatch = subTitle.match(/^Operated by\s+(.+?)\s*\(([A-Z0-9]+)\)\s*(\d+)$/i)
      if (operatedMatch) {
        operatingName = operatedMatch[1].trim()
        operatingIata = operatedMatch[2]
        operatingFlightNumber = `${operatedMatch[2]}${operatedMatch[3]}`
      } else {
        const mainMatch = mainTitle.match(/^(.+?)\s*\(([A-Z0-9]+)\)\s*(\d+)$/)
        if (mainMatch) {
          operatingName = mainMatch[1].trim()
          operatingIata = mainMatch[2]
          operatingFlightNumber = `${mainMatch[2]}${mainMatch[3]}`
        }
      }

      let durationMinutes = null
      const durText = dep.duration ?? arr.duration ?? null
      if (durText) {
        const m = durText.match(/^\s*(\d+)\s*hr?s?\s*(?:(\d+)\s*min?s?)?\s*$/i)
        if (m) {
          const h = parseInt(m[1], 10)
          const min = m[2] ? parseInt(m[2], 10) : 0
          durationMinutes = h * 60 + min
        }
      }
      if (durationMinutes == null && departureTime && arrivalTime) {
        durationMinutes = Math.round((new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000)
      }
      if (durationMinutes != null && durationMinutes <= 0) durationMinutes = null

      const updates = { status }
      if (departureTime) updates.departure_time = departureTime
      if (arrivalTime) updates.arrival_time = arrivalTime
      if (durationMinutes != null) updates.duration_minutes = durationMinutes
      if (scheduledDep) updates.scheduled_departure_time = scheduledDep
      if (scheduledArr) updates.scheduled_arrival_time = scheduledArr
      if (dep.terminal) updates.departure_terminal = dep.terminal
      if (dep.gate) updates.departure_gate = dep.gate
      if (arr.terminal) updates.arrival_terminal = arr.terminal
      if (arr.gate) updates.arrival_gate = arr.gate
      if (arr.baggage) updates.arrival_baggage = arr.baggage
      if (operatingName) updates.operating_airline_name = operatingName
      if (operatingIata) updates.operating_airline_iata = operatingIata
      if (operatingFlightNumber) updates.operating_flight_number = operatingFlightNumber

      await supabase.from('flights').update(updates).eq('id', flight.id)
      checked++
      console.log(`  ${flight.flight_number}: ${rawStatus} → ${status}`)
    } catch (err) {
      console.error(`  Error checking ${flight.flight_number}:`, err.message)
    }
  }

  console.log(`Checked ${checked} flight(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
