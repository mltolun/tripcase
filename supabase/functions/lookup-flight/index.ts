import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const statusMap: Record<string, string> = {
  Scheduled: 'scheduled',
  Active: 'active',
  EnRoute: 'active',
  Departed: 'active',
  Approaching: 'active',
  Landed: 'landed',
  Arrived: 'landed',
  Delayed: 'delayed',
  Cancelled: 'cancelled',
  Canceled: 'cancelled',
  Diverted: 'diverted',
  Unknown: 'unknown',
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
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  return (utcMs - localMs) / 60000
}

function localToUtc(localIso: string, airportCode: string | null): Date {
  const d = new Date(localIso + (localIso.endsWith('Z') ? '' : 'Z'))
  if (!airportCode) return d
  const offset = getAirportOffset(airportCode, d)
  return new Date(d.getTime() + offset * 60000)
}

function extractDate(isoStr: string | null): string | null {
  if (!isoStr) return null
  return isoStr.slice(0, 10)
}

function extractDateFromLabel(label: string | null, fallbackDate: string): string {
  if (!label) return fallbackDate
  const m = label.match(/(\w{3}\s+\d{1,2})/)
  if (!m) return fallbackDate
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const parts = m[1].split(' ')
  const month = months[parts[0].toLowerCase().slice(0, 3)] ?? '01'
  const day = parts[1].padStart(2, '0')
  return `${fallbackDate.slice(0, 4)}-${month}-${day}`
}

async function lookupFlightStats(airline: string, number: string, year: number, month: number, day: number) {
  const url = `https://www.flightstats.com/v2/flight-tracker/${airline}/${number}?year=${year}&month=${month}&date=${day}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  })
  if (!response.ok) throw new Error(`FlightStats fetch failed: ${response.status}`)
  const html = await response.text()
  const $ = cheerio.load(html)
  const scriptText = $('script')
    .toArray()
    .map(el => $(el).text())
    .find(t => t.includes('__NEXT_DATA__'))
  if (!scriptText) return null
  const jsonMatch = scriptText.match(/__NEXT_DATA__\s*=\s*({.*?});/)
  if (!jsonMatch) return null
  const nextData = JSON.parse(jsonMatch[1])
  const flightData = nextData?.props?.initialState?.flightTracker?.flight
  if (!flightData?.flightId) return null
  return flightData
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { airline_iata, flight_number, departure_date } = await req.json()
    if (!flight_number) throw new Error('flight_number is required')

    const match = flight_number.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
    if (!match) throw new Error(`Invalid flight number format: ${flight_number}`)
    const airline = match[1].toUpperCase()
    const number = match[2]

    const depDate = departure_date ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    let year: number, month: number, day: number
    {
      const d = new Date(depDate + 'T00:00:00')
      year = d.getFullYear()
      month = d.getMonth() + 1
      day = d.getDate()
    }

    // Try FlightView API (primary — more reliable, wider coverage)
    const fvFlight = await lookupFlightView(airline, number, depDate)

    if (fvFlight) {
      const dep = fvFlight.departure ?? {}
      const arr = fvFlight.arrival ?? {}
      const ac = fvFlight.aircraft ?? {}
      const title = fvFlight.titles?.main ?? ''

      const titleMatch = title.match(/^(.+?)\s*\(([A-Z0-9]+)\)\s*(\d+)$/)
      const airlineName = titleMatch?.[1]?.trim() ?? null
      const airlineIata = titleMatch?.[2] ?? airline
      const flightNum = titleMatch ? `${titleMatch[2]}${titleMatch[3]}` : flight_number

      const depDateLabel = extractDateFromLabel(dep.scheduledTime, depDate)
      const arrDateLabel = extractDateFromLabel(arr.scheduledTime, depDate)

      const depTimeIso = dep.departureDateTime ?? null
      const arrTimeIso = arr.arrivalDateTime ?? null
      let durationMinutes: number | null = null
      if (depTimeIso && arrTimeIso) {
        const depUtc = localToUtc(depTimeIso, dep.airportCode ?? null)
        const arrUtc = localToUtc(arrTimeIso, arr.airportCode ?? null)
        durationMinutes = Math.round((arrUtc.getTime() - depUtc.getTime()) / 60000)
      }

      const result = {
        airline_iata: airlineIata,
        airline_name: airlineName,
        flight_number: flightNum,
        departure_airport_code: dep.airportCode ?? null,
        departure_airport_name: dep.airport ?? null,
        departure_time: depTimeIso,
        departure_date: depDateLabel,
        departure_terminal: dep.terminal ?? null,
        departure_gate: dep.gate ?? null,
        arrival_airport_code: arr.airportCode ?? null,
        arrival_airport_name: arr.airport ?? null,
        arrival_time: arrTimeIso,
        arrival_date: arrDateLabel,
        arrival_terminal: arr.terminal ?? null,
        arrival_gate: arr.gate ?? null,
        arrival_baggage: arr.baggage ?? null,
        aircraft_type: ac.name ?? ac.code ?? null,
        status: statusMap[fvFlight.flightStatus ?? ''] ?? 'scheduled',
        duration_minutes: durationMinutes,
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fallback to FlightStats (gives accurate UTC times)
    const flightData = await lookupFlightStats(airline, number, year, month, day)

    if (!flightData) throw new Error('Flight not found')

    const schedule = flightData.schedule ?? {}
    const depAirport = flightData.departureAirport ?? {}
    const arrAirport = flightData.arrivalAirport ?? {}
    const header = flightData.resultHeader ?? {}
    const statusObj = flightData.status ?? {}
    const equip = flightData.additionalFlightInfo?.equipment ?? {}

    const depLocal = schedule.scheduledDeparture ?? null
    const depUtc = schedule.scheduledDepartureUTC ?? null
    const arrLocal = schedule.scheduledArrival ?? null
    const arrUtc = schedule.scheduledArrivalUTC ?? null

    let durationMinutes: number | null = null
    if (depUtc && arrUtc) {
      const d = new Date(depUtc + (depUtc.endsWith('Z') ? '' : 'Z'))
      const a = new Date(arrUtc + (arrUtc.endsWith('Z') ? '' : 'Z'))
      durationMinutes = Math.round((a.getTime() - d.getTime()) / 60000)
    }

    const result = {
      airline_iata: header?.carrier?.fs ?? null,
      airline_name: header?.carrier?.name ?? null,
      flight_number: header?.flightNumber ? `${header.carrier?.fs ?? ''}${header.flightNumber}` : flight_number,
      departure_airport_code: depAirport.iata ?? null,
      departure_airport_name: depAirport.name ?? null,
      departure_time: depUtc,
      departure_date: extractDate(depLocal) ?? extractDate(depUtc),
      departure_terminal: depAirport.terminal ?? null,
      departure_gate: depAirport.gate ?? null,
      arrival_airport_code: arrAirport.iata ?? null,
      arrival_airport_name: arrAirport.name ?? null,
      arrival_time: arrUtc,
      arrival_date: extractDate(arrLocal) ?? extractDate(arrUtc),
      arrival_terminal: arrAirport.terminal ?? null,
      arrival_gate: arrAirport.gate ?? null,
      arrival_baggage: arrAirport.baggage ?? null,
      aircraft_type: equip.name ?? equip.iata ?? null,
      status: statusMap[statusObj.status ?? ''] ?? 'scheduled',
      duration_minutes: durationMinutes,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})