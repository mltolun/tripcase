import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AIRPORT_TZ: Record<string, string> = {
  JFK: 'America/New_York', LGA: 'America/New_York', EWR: 'America/New_York',
  BOS: 'America/New_York', DCA: 'America/New_York', IAD: 'America/New_York',
  PHL: 'America/New_York', CLT: 'America/New_York', ATL: 'America/New_York',
  MIA: 'America/New_York', TPA: 'America/New_York', MCO: 'America/New_York',
  DTW: 'America/New_York', ORD: 'America/Chicago', MDW: 'America/Chicago',
  DFW: 'America/Chicago', IAH: 'America/Chicago', MSP: 'America/Chicago',
  DEN: 'America/Denver', PHX: 'America/Phoenix', SLC: 'America/Denver',
  SEA: 'America/Los_Angeles', PDX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles', LAX: 'America/Los_Angeles', SAN: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles', HNL: 'Pacific/Honolulu',
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

function getAirportOffset(airportCode: string, date: Date): number {
  const tzName = AIRPORT_TZ[airportCode]
  if (!tzName) return 0
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tzName, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  return (utcMs - localMs) / 60000
}

function localToUtc(localIso: string | null, airportCode: string | null): string | null {
  if (!localIso) return null
  const hasTz = /[Zz]|[+-]\d{2}:\d{2}$/.test(localIso)
  const isZeroOffset = /[+-]00:00$/.test(localIso)
  const d = new Date(hasTz ? localIso : localIso + 'Z')
  if ((hasTz && !isZeroOffset) || !airportCode || isNaN(d.getTime())) return d.toISOString()
  const offset = getAirportOffset(airportCode, d)
  return new Date(d.getTime() + offset * 60000).toISOString()
}

async function lookupFlightView(airline: string, number: string, departureDate: string) {
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

function parseScheduledTime(scheduledStr: string | null, airportCode: string | null, fallbackDate: string): string | null {
  if (!scheduledStr || !airportCode) return null
  const m = scheduledStr.match(/^(\d{2}:\d{2}),\s*(\w{3})\s*(\d{1,2})$/)
  if (!m) return null
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6,
    aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }
  const month = months[m[2].toLowerCase().slice(0, 3)]
  if (month === undefined) return null
  const year = new Date(fallbackDate + 'T00:00:00').getFullYear()
  const localIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(parseInt(m[3], 10)).padStart(2, '0')}T${m[1]}:00`
  return localToUtc(localIso, airportCode)
}

const statusMap: Record<string, string> = {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { flight_id, flight_number, departure_date } = await req.json()
    if (!flight_number) throw new Error('flight_number is required')
    const depDate = departure_date ?? new Date().toISOString().slice(0, 10)

    const match = flight_number.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
    if (!match) throw new Error(`Invalid flight number format: ${flight_number}`)
    const airline = match[1].toUpperCase()
    const number = match[2]

    const fvFlight = await lookupFlightView(airline, number, depDate)
    if (!fvFlight) throw new Error('Flight not found')

    const rawStatus = fvFlight.flightStatus ?? 'Scheduled'
    const status = statusMap[rawStatus] ?? 'unknown'

    const dep = fvFlight.departure ?? {}
    const arr = fvFlight.arrival ?? {}

    const departureTime = localToUtc(dep.departureDateTime ?? null, dep.airportCode ?? null)
    const arrivalTime = localToUtc(arr.arrivalDateTime ?? null, arr.airportCode ?? null)
    const scheduledDep = parseScheduledTime(dep.scheduledTime, dep.airportCode ?? null, depDate)
    const scheduledArr = parseScheduledTime(arr.scheduledTime, arr.airportCode ?? null, depDate)

    // Parse operating airline from titles.sub ("Operated by British Airways (BA) 273")
    // Fall back to titles.main ("Iberia (IB) 3616") if sub has no operated-by info
    const mainTitle = fvFlight.titles?.main ?? ''
    const subTitle = fvFlight.titles?.sub ?? ''
    let operatingName: string | null = null
    let operatingIata: string | null = null
    let operatingFlightNumber: string | null = null

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

    let durationMinutes: number | null = null
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (flight_id) {
      const updates: Record<string, unknown> = { status }
      if (departureTime) updates.departure_time = departureTime
      if (arrivalTime) updates.arrival_time = arrivalTime
      if (durationMinutes != null) updates.duration_minutes = durationMinutes
      if (dep.terminal) updates.departure_terminal = dep.terminal
      if (dep.gate) updates.departure_gate = dep.gate
      if (arr.terminal) updates.arrival_terminal = arr.terminal
      if (arr.gate) updates.arrival_gate = arr.gate
      if (arr.baggage) updates.arrival_baggage = arr.baggage
      if (operatingName) updates.operating_airline_name = operatingName
      if (operatingIata) updates.operating_airline_iata = operatingIata
      if (operatingFlightNumber) updates.operating_flight_number = operatingFlightNumber

      // Don't overwrite scheduled times — only update actual times.
      // Backfill scheduled times if they are null (for flights saved before the columns existed).
      if (scheduledDep) updates.scheduled_departure_time = scheduledDep
      if (scheduledArr) updates.scheduled_arrival_time = scheduledArr
      await supabase.from('flights').update(updates).eq('id', flight_id)
    }

    return new Response(JSON.stringify({
      status,
      raw_status: rawStatus,
      departure_time: departureTime,
      arrival_time: arrivalTime,
      scheduled_departure_time: scheduledDep,
      scheduled_arrival_time: scheduledArr,
      duration_minutes: durationMinutes,
      operating_airline_name: operatingName,
      operating_airline_iata: operatingIata,
      operating_flight_number: operatingFlightNumber,
      departure_terminal: dep.terminal ?? null,
      departure_gate: dep.gate ?? null,
      arrival_terminal: arr.terminal ?? null,
      arrival_gate: arr.gate ?? null,
      arrival_baggage: arr.baggage ?? null,
      source: 'flightview',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
