import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import * as cheerio from 'cheerio'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: { transport: WebSocket },
})

const statusMap = {
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

async function main() {
  const now = new Date()
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000)

  const { data: flights, error } = await supabase
    .from('flights')
    .select('id, flight_number, departure_time, arrival_time, status')
    .or(
      `and(departure_time.gte.${now.toISOString()},departure_time.lte.${in4h.toISOString()}),` +
      `and(departure_time.lt.${now.toISOString()},arrival_time.gte.${now.toISOString()})`
    )
    .not('status', 'in', '("landed","cancelled")')
    .not('flight_number', 'is', null)

  if (error) {
    console.error('Query error:', error)
    process.exit(1)
  }

  if (!flights?.length) {
    console.log('No flights to check')
    return
  }

  console.log(`Checking ${flights.length} flight(s)...`)

  let checked = 0
  for (const flight of flights) {
    try {
      const match = flight.flight_number.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
      if (!match) continue

      const airline = match[1].toUpperCase()
      const number = match[2]
      const date = flight.departure_time.slice(0, 10)
      const url = `https://www.flightview.com/flight-tracker/${airline}/${number}?date=${date}`

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

      const rawStatus =
        $('.status', '#ffDetails').text().trim() ||
        $('[class*="status"]').first().text().trim() ||
        'Scheduled'

      const status = statusMap[rawStatus] ?? 'unknown'

      await supabase.from('flights').update({ status }).eq('id', flight.id)
      checked++
      console.log(`  ${flight.flight_number}: ${rawStatus} → ${status}`)
    } catch (err) {
      console.error(`  Error checking ${flight.flight_number}:`, err.message)
    }
  }

  console.log(`Checked ${checked} flight(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
