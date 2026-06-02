import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function localToUtc(localIso: string, airportCode: string | null): Date {
  const hasTz = /[Zz]|[+-]\d{2}:\d{2}$/.test(localIso)
  const isZeroOffset = /[+-]00:00$/.test(localIso)
  const d = new Date(hasTz ? localIso : localIso + 'Z')
  if ((hasTz && !isZeroOffset) || !airportCode || isNaN(d.getTime())) return d
  const offset = getAirportOffset(airportCode, d)
  return new Date(d.getTime() + offset * 60000)
}

function parseDurationText(text: string | null | undefined): number | null {
  if (!text) return null
  const m = text.match(/^\s*(\d+)\s*hr?s?\s*(?:(\d+)\s*min?s?)?\s*$/i)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  return h * 60 + min
}

function getDurationMinutes(depIso: string | null, arrIso: string | null, depAirport?: string | null, arrAirport?: string | null): number | null {
  if (!depIso || !arrIso) return null
  const dep = localToUtc(depIso, depAirport ?? null)
  const arr = localToUtc(arrIso, arrAirport ?? null)
  const diff = arr.getTime() - dep.getTime()
  if (diff <= 0) return null
  return Math.round(diff / 60000)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: flights, error } = await supabase
      .from('flights')
      .select('id, airline_iata, flight_number, departure_time, arrival_time')
      .is('duration_minutes', null)
      .not('flight_number', 'is', null)
      .limit(50)

    if (error) throw new Error(error.message)
    if (!flights || flights.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: 'No flights need backfill' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: { id: string; duration_minutes: number | null; source: string }[] = []
    let updated = 0
    let failed = 0

    for (const flight of flights) {
      const fn = flight.flight_number ?? ''
      const match = fn.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
      if (!match) { failed++; continue }

      const airline = match[1].toUpperCase()
      const number = match[2]
      const depDate = (flight.departure_time ?? '').slice(0, 10)
      if (!depDate) { failed++; continue }

      let durationMinutes: number | null = null
      let source = ''

      const fvFlight = await lookupFlightView(airline, number, depDate)
      if (fvFlight) {
        durationMinutes = parseDurationText(fvFlight.departure?.duration)
        if (durationMinutes == null) durationMinutes = parseDurationText(fvFlight.arrival?.duration)
        if (durationMinutes == null) durationMinutes = parseDurationText(fvFlight.duration)
        if (durationMinutes == null) {
          durationMinutes = getDurationMinutes(
            fvFlight.departure?.departureDateTime ?? null,
            fvFlight.arrival?.arrivalDateTime ?? null,
            fvFlight.departure?.airportCode ?? null,
            fvFlight.arrival?.airportCode ?? null
          )
        }
        source = 'flightview'
      } else {
        const d = new Date(depDate + 'T00:00:00')
        const flightData = await lookupFlightStats(airline, number, d.getFullYear(), d.getMonth() + 1, d.getDate())
        if (flightData) {
          durationMinutes = getDurationMinutes(
            flightData.schedule?.scheduledDepartureUTC ?? null,
            flightData.schedule?.scheduledArrivalUTC ?? null
          )
          source = 'flightstats'
        }
      }

      if (durationMinutes != null) {
        await supabase.from('flights').update({ duration_minutes: durationMinutes }).eq('id', flight.id)
        updated++
      } else {
        failed++
      }

      results.push({ id: flight.id, duration_minutes: durationMinutes, source })
      await new Promise(r => setTimeout(r, 300))
    }

    return new Response(JSON.stringify({ updated, failed, total: flights.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
