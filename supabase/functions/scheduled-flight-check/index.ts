// Supabase Edge Function — runs on a cron schedule every 30 minutes.
// Set up via: supabase functions deploy scheduled-flight-check --schedule "*/30 * * * *"
// Only checks flights departing within the next 24 hours to conserve API quota.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Only check flights departing in the next 24 hours that aren't already landed/cancelled
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
    Unknown: 'unknown', Expected: 'scheduled', EnRoute: 'active',
    CheckIn: 'scheduled', Boarding: 'scheduled', GateClosed: 'scheduled',
    Departed: 'active', Delayed: 'delayed', Approaching: 'active',
    Landed: 'landed', Arrived: 'landed', Cancelled: 'cancelled',
    Diverted: 'diverted', CanceledUncertain: 'cancelled',
  }

  let checked = 0
  for (const flight of flights) {
    try {
      const num = flight.flight_number.replace(/\s/g, '')
      const date = flight.departure_time.slice(0, 10)
      const res = await fetch(
        `https://aerodatabox.p.rapidapi.com/flights/number/${num}/${date}`,
        { headers: { 'X-RapidAPI-Key': rapidApiKey ?? '', 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      const raw = (Array.isArray(data) ? data[0] : data)?.status ?? 'Unknown'
      const status = statusMap[raw] ?? 'unknown'
      await supabase.from('flights').update({ status }).eq('id', flight.id)
      checked++
    } catch { /* skip on error */ }
  }

  return new Response(JSON.stringify({ checked }), { status: 200 })
})
