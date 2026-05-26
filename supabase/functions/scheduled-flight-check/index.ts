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

  let checked = 0
  for (const flight of flights) {
    try {
      const num = flight.flight_number.replace(/\s/g, '')
      const date = flight.departure_time.slice(0, 10)
      const url = `https://www.flightview.com/flight-tracker/${num}?date=${date}`

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      if (!res.ok) continue

      const html = await res.text()
      const $ = cheerio.load(html)

      const rawStatus =
        $('.status', '#ffDetails').text().trim() ||
        $('[class*="status"]').first().text().trim() ||
        'Scheduled'

      const status = statusMap[rawStatus] ?? 'unknown'

      await supabase.from('flights').update({ status }).eq('id', flight.id)
      checked++
    } catch { /* skip on error */ }
  }

  return new Response(JSON.stringify({ checked }), { status: 200 })
})
