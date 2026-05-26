// Supabase Edge Function — runs on a cron schedule every 30 minutes.
// Set up via: supabase functions deploy scheduled-flight-check --schedule "*/30 * * * *"
// Only checks flights departing within the next 24 hours.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: flights, error } = await supabase
    .from('flights')
    .select('id, flight_number, departure_time, status')
    .gte('departure_time', now.toISOString())
    .lte('departure_time', in24h.toISOString())
    .not('status', 'in', '("landed","cancelled")')
    .not('flight_number', 'is', null)

  if (error || !flights?.length) {
    return new Response(JSON.stringify({ checked: 0 }), { status: 200 })
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

  let checked = 0
  for (const flight of flights) {
    try {
      const match = flight.flight_number.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
      if (!match) continue
      const airline = match[1].toUpperCase()
      const number = match[2]

      const d = new Date(flight.departure_time)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const day = d.getDate()

      const url = `https://www.flightstats.com/v2/flight-tracker/${airline}/${number}?year=${year}&month=${month}&date=${day}`

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      if (!res.ok) continue

      const html = await res.text()
      const $ = cheerio.load(html)

      const scriptText = $('script')
        .toArray()
        .map(el => $(el).text())
        .find(t => t.includes('__NEXT_DATA__'))

      if (!scriptText) continue

      const jsonMatch = scriptText.match(/__NEXT_DATA__\s*=\s*({.*?});/)
      if (!jsonMatch) continue

      const nextData = JSON.parse(jsonMatch[1])
      const flightData = nextData?.props?.initialState?.flightTracker?.flight
      if (!flightData?.flightId) continue

      const rawStatus = flightData?.status?.status ?? 'Unknown'
      const status = statusMap[rawStatus] ?? 'unknown'

      await supabase.from('flights').update({ status }).eq('id', flight.id)
      checked++
    } catch { /* skip on error */ }
  }

  return new Response(JSON.stringify({ checked }), { status: 200 })
})
