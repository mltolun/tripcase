import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { flight_id, flight_number, departure_date } = await req.json()
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')

    if (!rapidApiKey) throw new Error('RAPIDAPI_KEY not configured')

    // AeroDataBox API via RapidAPI
    const flightNum = flight_number.replace(/\s/g, '')
    const res = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/number/${flightNum}/${departure_date}`,
      {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
        },
      }
    )

    if (!res.ok) throw new Error(`AeroDataBox API error: ${res.status}`)

    const data = await res.json()
    const flightData = Array.isArray(data) ? data[0] : data

    // Map AeroDataBox status to our status
    const statusMap: Record<string, string> = {
      Unknown: 'unknown',
      Expected: 'scheduled',
      EnRoute: 'active',
      CheckIn: 'scheduled',
      Boarding: 'scheduled',
      GateClosed: 'scheduled',
      Departed: 'active',
      Delayed: 'delayed',
      Approaching: 'active',
      Landed: 'landed',
      Arrived: 'landed',
      Cancelled: 'cancelled',
      Diverted: 'diverted',
      CanceledUncertain: 'cancelled',
    }

    const rawStatus = flightData?.status ?? 'Unknown'
    const status = statusMap[rawStatus] ?? 'unknown'

    // Update the flight in the database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (flight_id) {
      await supabase.from('flights').update({ status }).eq('id', flight_id)
    }

    return new Response(JSON.stringify({ status, raw: rawStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
