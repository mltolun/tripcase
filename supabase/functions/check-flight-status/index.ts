import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const url = `https://www.flightview.com/flight-tracker/${airline}/${number}?date=${depDate}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!response.ok) {
      throw new Error(`FlightView fetch failed: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const flightStatus =
      $('.status', '#ffDetails').text().trim() ||
      $('[class*="status"]').first().text().trim() ||
      'Scheduled'

    const statusMap: Record<string, string> = {
      Scheduled: 'scheduled',
      Active: 'active',
      Departed: 'active',
      'En Route': 'active',
      EnRoute: 'active',
      Approaching: 'active',
      Landed: 'landed',
      Arrived: 'landed',
      Delayed: 'delayed',
      Cancelled: 'cancelled',
      Canceled: 'cancelled',
      Diverted: 'diverted',
      Unknown: 'unknown',
    }

    const status = statusMap[flightStatus] ?? 'unknown'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (flight_id) {
      await supabase.from('flights').update({ status }).eq('id', flight_id)
    }

    return new Response(JSON.stringify({ status, raw: flightStatus, source: 'flightview' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
