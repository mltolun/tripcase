import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    let year: number, month: number, day: number
    if (departure_date) {
      const d = new Date(departure_date + 'T00:00:00')
      year = d.getFullYear()
      month = d.getMonth() + 1
      day = d.getDate()
    } else {
      const tomorrow = new Date(Date.now() + 86400000)
      year = tomorrow.getFullYear()
      month = tomorrow.getMonth() + 1
      day = tomorrow.getDate()
    }

    const url = `https://www.flightstats.com/v2/flight-tracker/${airline}/${number}?year=${year}&month=${month}&date=${day}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!response.ok) {
      throw new Error(`FlightStats fetch failed: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const scriptText = $('script')
      .toArray()
      .map(el => $(el).text())
      .find(t => t.includes('__NEXT_DATA__'))

    if (!scriptText) throw new Error('No flight data found on page')

    const jsonMatch = scriptText.match(/__NEXT_DATA__\s*=\s*({.*?});/)
    if (!jsonMatch) throw new Error('Could not parse flight data')

    const nextData = JSON.parse(jsonMatch[1])
    const flightData = nextData?.props?.initialState?.flightTracker?.flight

    if (!flightData || !flightData.flightId) {
      throw new Error('Flight not found')
    }

    function extractTime(isoStr: string | null, isLocal: boolean): string | null {
      if (!isoStr) return null
      const cleaned = isoStr.replace('Z', '')
      const parts = cleaned.split('T')
      if (parts.length < 2) return null
      return parts[1].slice(0, 5)
    }

    function extractDate(isoStr: string | null): string | null {
      if (!isoStr) return null
      return isoStr.slice(0, 10)
    }

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

    const result = {
      airline_iata: header?.carrier?.fs ?? null,
      airline_name: header?.carrier?.name ?? null,
      flight_number: header?.flightNumber ? `${header.carrier?.fs ?? ''}${header.flightNumber}` : flight_number,
      departure_airport_code: depAirport.iata ?? null,
      departure_airport_name: depAirport.name ?? null,
      departure_time: depUtc,
      departure_time_local: extractTime(depLocal, true),
      departure_date: extractDate(depLocal) ?? extractDate(depUtc),
      departure_terminal: depAirport.terminal ?? null,
      departure_gate: depAirport.gate ?? null,
      arrival_airport_code: arrAirport.iata ?? null,
      arrival_airport_name: arrAirport.name ?? null,
      arrival_time: arrUtc,
      arrival_time_local: extractTime(arrLocal, true),
      arrival_date: extractDate(arrLocal) ?? extractDate(arrUtc),
      arrival_terminal: arrAirport.terminal ?? null,
      arrival_gate: arrAirport.gate ?? null,
      arrival_baggage: arrAirport.baggage ?? null,
      aircraft_type: equip.name ?? equip.iata ?? null,
      status: statusMap[statusObj.status ?? ''] ?? 'scheduled',
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
