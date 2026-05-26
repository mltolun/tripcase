import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let bodyText
    try {
      bodyText = await req.text()
    } catch (e) {
      throw new Error(`Failed to read request body: ${(e as Error).message}`)
    }
    console.log('Request body length:', bodyText?.length)

    if (!bodyText || bodyText.length === 0) {
      throw new Error('Request body is empty')
    }

    let parsed
    try {
      parsed = JSON.parse(bodyText)
    } catch (e) {
      throw new Error(`Failed to parse request body as JSON: ${(e as Error).message}`)
    }

    const { airline_iata, flight_number } = parsed
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    console.log('lookup-flight called', { airline_iata, flight_number, tomorrow })

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!rapidApiKey) throw new Error('RAPIDAPI_KEY not configured')
    if (!flight_number) throw new Error('flight_number is required')

    const flightNum = flight_number.replace(/\s/g, '')
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNum}/${tomorrow}?withAircraftImage=false&withLocation=false`
    console.log('Fetching AeroDataBox URL:', url)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    console.log('AeroDataBox response status:', res.status)

    const responseText = await res.text()
    console.log('AeroDataBox response length:', responseText.length, 'status:', res.status)

    if (!res.ok) {
      console.log('AeroDataBox error body:', responseText.slice(0, 500))
      throw new Error(`AeroDataBox API error: ${res.status} — ${responseText.slice(0, 200)}`)
    }

    if (!responseText || responseText.trim().length === 0) {
      console.log('AeroDataBox returned empty 200 response')
      return new Response(JSON.stringify({ error: 'AeroDataBox returned empty response for this flight' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Failed to parse AeroDataBox response: ${(e as Error).message}`)
    }
    const flights = Array.isArray(data) ? data : []
    console.log('AeroDataBox flights count:', flights.length)

    // The flight number already uniquely identifies a flight, so use the first result
    // (airline_iata filter is omitted because codeshare flights return the operating carrier,
    //  e.g. IB3616 comes back as British Airways, not Iberia)
    const match = flights

    if (match.length === 0) {
      console.log('No matching flight found')
      return new Response(JSON.stringify({ error: 'Flight not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const f = match[0]
    console.log('Raw status from API:', f.status)

    const statusMap: Record<string, string> = {
      Unknown: 'unknown', Expected: 'scheduled', EnRoute: 'active',
      CheckIn: 'scheduled', Boarding: 'scheduled', GateClosed: 'scheduled',
      Departed: 'active', Delayed: 'delayed', Approaching: 'active',
      Landed: 'landed', Arrived: 'landed', Cancelled: 'cancelled',
      Diverted: 'diverted', CanceledUncertain: 'cancelled',
    }

    function extractLocalTime(t: unknown): string | null {
      if (!t) return null
      if (typeof t === 'object' && t !== null) {
        const obj = t as Record<string, string>
        const raw = obj.local ?? obj.utc
        if (!raw) return null
        const m = raw.match(/(\d{2}:\d{2})/)
        return m ? m[1] : null
      }
      return null
    }

    function extractUtcTime(t: unknown): string | null {
      if (!t) return null
      if (typeof t === 'object' && t !== null) {
        const obj = t as Record<string, string>
        if (!obj.utc) return null
        const m = obj.utc.match(/(\d{2}:\d{2})/)
        return m ? m[1] : null
      }
      return null
    }

    const mappedStatus = statusMap[f.status ?? ''] ?? 'unknown'
    console.log('Mapped status:', mappedStatus)

    const result = {
      airline_iata: f.airline?.iata ?? null,
      airline_name: f.airline?.name ?? null,
      flight_number: f.flightNumber ?? flightNum,
      departure_airport_code: f.departure?.airport?.iata ?? null,
      departure_airport_name: f.departure?.airport?.name ?? null,
      departure_time: extractUtcTime(f.departure?.scheduledTime),
      departure_time_local: extractLocalTime(f.departure?.scheduledTime),
      arrival_airport_code: f.arrival?.airport?.iata ?? null,
      arrival_airport_name: f.arrival?.airport?.name ?? null,
      arrival_time: extractUtcTime(f.arrival?.scheduledTime),
      arrival_time_local: extractLocalTime(f.arrival?.scheduledTime),
      aircraft_type: f.aircraft?.type ?? f.aircraft?.model ?? null,
      status: mappedStatus,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('lookup-flight error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
