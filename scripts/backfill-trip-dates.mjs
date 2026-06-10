import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, name, start_date, end_date')

  if (error) {
    console.error('Failed to fetch trips:', error.message)
    process.exit(1)
  }

  console.log(`Found ${trips.length} trip(s)\n`)

  let updated = 0
  let skipped = 0

  for (const trip of trips) {
    const { data: flights, error: fErr } = await supabase
      .from('flights')
      .select('departure_time, arrival_time')
      .eq('trip_id', trip.id)
      .order('departure_time', { ascending: true })

    if (fErr) {
      console.error(`  Error fetching flights for "${trip.name}": ${fErr.message}`)
      skipped++
      continue
    }

    if (!flights || flights.length === 0) {
      skipped++
      continue
    }

    const startDate = flights[0].departure_time.slice(0, 10)
    const endDate = flights[flights.length - 1].arrival_time.slice(0, 10)

    if (trip.start_date === startDate && trip.end_date === endDate) {
      skipped++
      continue
    }

    const { error: uErr } = await supabase
      .from('trips')
      .update({ start_date: startDate, end_date: endDate })
      .eq('id', trip.id)

    if (uErr) {
      console.error(`  Error updating "${trip.name}": ${uErr.message}`)
      skipped++
    } else {
      updated++
      console.log(`  ✓ "${trip.name}": ${startDate} → ${endDate}`)
    }
  }

  console.log(`\nDone! ${updated} trip(s) updated, ${skipped} skipped`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
