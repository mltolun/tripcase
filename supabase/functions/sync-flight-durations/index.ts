import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function parseDurationText(text: string | null | undefined): number | null {
  if (!text) return null
  const m = text.match(/^\s*(\d+)\s*hr?s?\s*(?:(\d+)\s*min?s?)?\s*$/i)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  return h * 60 + min
}

async function fetchFlightViewDuration(airline: string, number: string, departureDate: string): Promise<number | null> {
  const url = `https://app-api.flightview.com/api/v2/flight/${airline}/${number}?departureDate=${departureDate}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-GB",
      "Referer": `https://www.flightview.com/flight-tracker/${airline}/${number}?date=${departureDate}`,
      "Origin": "https://www.flightview.com",
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.emptyResults || !data.flight) return null

  const dep = data.flight.departure ?? {}
  const arr = data.flight.arrival ?? {}

  let durationMinutes = parseDurationText(dep.duration)
  if (durationMinutes == null && dep.departureDateTime && arr.arrivalDateTime) {
    const d = new Date(dep.departureDateTime)
    const a = new Date(arr.arrivalDateTime)
    if (!isNaN(d.getTime()) && !isNaN(a.getTime())) {
      durationMinutes = Math.round((a.getTime() - d.getTime()) / 60000)
    }
  }

  return durationMinutes
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { data: flights, error } = await supabase
      .from("flights")
      .select("id, airline_iata, flight_number, departure_time")
      .not("flight_number", "is", null)
      .not("airline_iata", "is", null)

    if (error) throw new Error(error.message)
    if (!flights || flights.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: "No flights found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let updated = 0
    let failed = 0
    const results: { id: string; flight: string; duration_minutes: number | null }[] = []

    for (const flight of flights) {
      const fn = flight.flight_number ?? ""
      const match = fn.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
      if (!match) { failed++; continue }

      const airline = match[1].toUpperCase()
      const number = match[2]
      const depDate = (flight.departure_time ?? "").slice(0, 10)
      if (!depDate) { failed++; continue }

      const durationMinutes = await fetchFlightViewDuration(airline, number, depDate)

      if (durationMinutes != null) {
        await supabase.from("flights").update({ duration_minutes: durationMinutes }).eq("id", flight.id)
        updated++
      } else {
        failed++
      }

      results.push({ id: flight.id, flight: fn, duration_minutes: durationMinutes })
      await new Promise(r => setTimeout(r, 300))
    }

    return new Response(JSON.stringify({ updated, failed, total: flights.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
