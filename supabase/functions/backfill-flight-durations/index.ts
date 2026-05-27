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

function getDurationMinutes(depIso: string | null, arrIso: string | null): number | null {
  if (!depIso || !arrIso) return null
  const diff = new Date(arrIso).getTime() - new Date(depIso).getTime()
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
        durationMinutes = getDurationMinutes(
          fvFlight.departure?.departureDateTime ?? null,
          fvFlight.arrival?.arrivalDateTime ?? null
        )
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
