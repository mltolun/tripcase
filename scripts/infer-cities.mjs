import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
let supabaseUrl = '', supabaseKey = ''
try {
  const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*VITE_SUPABASE_URL=(.+)\s*$/)
    if (m) supabaseUrl = m[1].trim()
    const m2 = line.match(/^\s*SUPABASE_SERVICE_ROLE_KEY=(.+)\s*$/)
    if (m2) supabaseKey = m2[1].trim()
  }
} catch {
  console.error('Missing .env file — create it with:\nVITE_SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=your-key')
  process.exit(1)
}
if (!supabaseUrl || !supabaseKey) {
  console.error('.env must contain VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const UA = 'TripCase/1.0 (city-photo-backfill)'

// Wikipedia sometimes needs a different title than the city name
const WIKIPEDIA_ALIAS = {
  'New York': 'New York City',
  'Lima': 'Lima, Peru',
  'Santiago': 'Santiago, Chile',
  'Montevideo': 'Montevideo, Uruguay',
  'Rio de Janeiro': 'Rio de Janeiro, Brazil',
  'São Paulo': 'São Paulo, Brazil',
  'Bogotá': 'Bogotá, Colombia',
  'Quito': 'Quito, Ecuador',
  'Panama City': 'Panama City, Panama',
  'Mexico City': 'Mexico City, Mexico',
  'Bangalore': 'Bangalore, India',
  'Mumbai': 'Mumbai, India',
  'Delhi': 'Delhi, India',
}

const AIRPORT_CITY = {
  ATL: 'Atlanta', JFK: 'New York', LGA: 'New York', EWR: 'New York',
  BOS: 'Boston', DCA: 'Washington', IAD: 'Washington', PHL: 'Philadelphia',
  CLT: 'Charlotte', MIA: 'Miami', TPA: 'Tampa', MCO: 'Orlando',
  DTW: 'Detroit', ORD: 'Chicago', MDW: 'Chicago', DFW: 'Dallas',
  IAH: 'Houston', MSP: 'Minneapolis', DEN: 'Denver', PHX: 'Phoenix',
  SLC: 'Salt Lake City', SEA: 'Seattle', PDX: 'Portland',
  SFO: 'San Francisco', LAX: 'Los Angeles', SAN: 'San Diego',
  LAS: 'Las Vegas', HNL: 'Honolulu', SJD: 'San Jose del Cabo',
  LHR: 'London', LGW: 'London', CDG: 'Paris', ORY: 'Paris',
  AMS: 'Amsterdam', FRA: 'Frankfurt', MUC: 'Munich', BER: 'Berlin',
  FCO: 'Rome', MXP: 'Milan', BCN: 'Barcelona', MAD: 'Madrid',
  ZRH: 'Zurich', GVA: 'Geneva', CPH: 'Copenhagen', ARN: 'Stockholm',
  OSL: 'Oslo', HEL: 'Helsinki', DUB: 'Dublin', BRU: 'Brussels',
  LIS: 'Lisbon', ATH: 'Athens', IST: 'Istanbul', VIE: 'Vienna',
  PRG: 'Prague', BUD: 'Budapest', WAW: 'Warsaw', KRK: 'Krakow',
  NCE: 'Nice', MRS: 'Marseille', LYS: 'Lyon', TLS: 'Toulouse',
  HND: 'Tokyo', NRT: 'Tokyo', KIX: 'Osaka', ICN: 'Seoul',
  PVG: 'Shanghai', PEK: 'Beijing', HKG: 'Hong Kong', SIN: 'Singapore',
  BKK: 'Bangkok', DEL: 'Delhi', BOM: 'Mumbai', DXB: 'Dubai',
  SYD: 'Sydney', MEL: 'Melbourne', AKL: 'Auckland', MNL: 'Manila',
  KUL: 'Kuala Lumpur', CGK: 'Jakarta', DPS: 'Bali', HKT: 'Phuket',
  EZE: 'Buenos Aires', GRU: 'São Paulo', GIG: 'Rio de Janeiro',
  SCL: 'Santiago', LIM: 'Lima', BOG: 'Bogotá', MEX: 'Mexico City',
  CUN: 'Cancún', NAS: 'Nassau', SJU: 'San Juan', PTY: 'Panama City',
  AGP: 'Málaga', IBZ: 'Ibiza', PMI: 'Palma de Mallorca',
  TFS: 'Tenerife', LPA: 'Las Palmas', FAO: 'Faro', KEF: 'Reykjavík',
  MLA: 'Malta', CTA: 'Catania', PMO: 'Palermo', NAP: 'Naples',
  VCE: 'Venice', BLQ: 'Bologna', PSA: 'Pisa', GOA: 'Genoa',
  FLR: 'Florence', BGY: 'Bergamo', TRN: 'Turin', CAG: 'Cagliari',
  OLB: 'Olbia', NGO: 'Nagoya', CTS: 'Sapporo',
  FUK: 'Fukuoka', OKA: 'Naha', YYZ: 'Toronto',
  YVR: 'Vancouver', YUL: 'Montreal', YYC: 'Calgary',
  BWI: 'Baltimore', FLL: 'Fort Lauderdale', STL: 'St. Louis',
  STN: 'London', LTN: 'London', DUS: 'Düsseldorf', HAM: 'Hamburg',
  STR: 'Stuttgart', CGN: 'Cologne', RIX: 'Riga', SOF: 'Sofia',
  ZAG: 'Zagreb', BEG: 'Belgrade', OTP: 'Bucharest',
  EVN: 'Yerevan', TBS: 'Tbilisi', CAI: 'Cairo', CMN: 'Casablanca',
  RAK: 'Marrakech', TUN: 'Tunis', ALG: 'Algiers', DKR: 'Dakar',
  ACC: 'Accra', NBO: 'Nairobi', JNB: 'Johannesburg', CPT: 'Cape Town',
  ADD: 'Addis Ababa', LOS: 'Lagos', MRU: 'Mauritius',
  BNE: 'Brisbane', PER: 'Perth', ADL: 'Adelaide', WLG: 'Wellington',
  CHC: 'Christchurch', NAN: 'Nadi', PPT: 'Papeete',
  AMM: 'Amman', TLV: 'Tel Aviv', BEY: 'Beirut', KWI: 'Kuwait',
  MCT: 'Muscat', BAH: 'Manama', DOH: 'Doha', RUH: 'Riyadh',
  JED: 'Jeddah', MED: 'Medina',
  BZE: 'Belize City', GUA: 'Guatemala City', SAL: 'San Salvador',
  KIN: 'Kingston', MBJ: 'Montego Bay', CUR: 'Curaçao', AUA: 'Aruba',
  BGI: 'Barbados', CCS: 'Caracas', HAV: 'Havana',
  SJO: 'San José', LIR: 'Liberia', PUJ: 'Punta Cana', SDQ: 'Santo Domingo',
  STT: 'St. Thomas', PSE: 'Ponce', POP: 'Puerto Plata',
  SNN: 'Shannon', MAN: 'Manchester', BHX: 'Birmingham', GLA: 'Glasgow',
}

const SPECIAL_CASE = {
  'sao paulo': 'São Paulo', 'rio de janeiro': 'Rio de Janeiro',
  'brasilia': 'Brasília', 'belo horizonte': 'Belo Horizonte',
  'porto alegre': 'Porto Alegre', 'mexico city': 'Mexico City',
  'los angeles': 'Los Angeles', 'las vegas': 'Las Vegas',
  'san francisco': 'San Francisco', 'new york': 'New York',
  'san juan': 'San Juan', 'san jose': 'San José',
  'san salvador': 'San Salvador', 'san diego': 'San Diego',
  'santo domingo': 'Santo Domingo', 'punta cana': 'Punta Cana',
  'santa cruz': 'Santa Cruz', 'buenos aires': 'Buenos Aires',
  'hong kong': 'Hong Kong', 'kuala lumpur': 'Kuala Lumpur',
  'salt lake city': 'Salt Lake City', 'panama city': 'Panama City',
  'fort lauderdale': 'Fort Lauderdale', 'st. louis': 'St. Louis',
  'cape town': 'Cape Town', 'tel aviv': 'Tel Aviv',
  'guatemala city': 'Guatemala City', 'san jose del cabo': 'San José del Cabo',
  'palma de mallorca': 'Palma de Mallorca',
  'belize city': 'Belize City', 'puerto plata': 'Puerto Plata',
  'montego bay': 'Montego Bay',
}

function toTitleCase(str) {
  const lower = str.trim().toLowerCase()
  if (SPECIAL_CASE[lower]) return SPECIAL_CASE[lower]
  return lower.replace(/\b\w/g, c => c.toUpperCase())
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000))
}

async function wikiFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  const text = await res.text()
  if (text.includes('You are making too many requests')) return null
  try { return JSON.parse(text) } catch { return null }
}

async function fetchCityPhoto(city, attempt = 1) {
  // Use Wikipedia alias if available (e.g., New York -> New York City)
  const searchTitle = WIKIPEDIA_ALIAS[city] || city

  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    titles: searchTitle, prop: 'pageimages', pithumbsize: '800'
  })
  let data = await wikiFetch(`https://en.wikipedia.org/w/api.php?${params}`)

  if (!data) {
    if (attempt <= 3) {
      const wait = attempt * 7000
      console.log(`  → Rate limited, waiting ${wait/1000}s (attempt ${attempt})...`)
      await sleep(wait)
      return fetchCityPhoto(city, attempt + 1)
    }
    return null
  }

  const pages = data?.query?.pages
  if (pages) {
    const page = Object.values(pages)[0]
    if (page?.thumbnail?.source) return page.thumbnail.source
  }

  // Fallback: search
  await sleep(3000)
  const searchParams = new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    list: 'search', srsearch: city.trim(), srlimit: 5
  })
  const searchData = await wikiFetch(`https://en.wikipedia.org/w/api.php?${searchParams}`)
  if (!searchData) {
    if (attempt <= 3) {
      const wait = attempt * 7000
      console.log(`  → Rate limited on search, waiting ${wait/1000}s...`)
      await sleep(wait)
      return fetchCityPhoto(city, attempt + 1)
    }
    return null
  }

  const results = searchData?.query?.search
  if (results && results.length > 0) {
    for (const result of results) {
      await sleep(3000)
      const imgParams = new URLSearchParams({
        action: 'query', format: 'json', origin: '*',
        titles: result.title, prop: 'pageimages', pithumbsize: '800'
      })
      const imgData = await wikiFetch(`https://en.wikipedia.org/w/api.php?${imgParams}`)
      if (imgData) {
        const imgPage = Object.values(imgData?.query?.pages || {})[0]
        if (imgPage?.thumbnail?.source) return imgPage.thumbnail.source
      }
    }
  }

  return null
}

function inferMainCity(flights, hotels) {
  const candidates = []

  // Hotels = where you actually stay → weight 10 (decisive)
  for (const h of hotels) {
    if (h.city) {
      candidates.push({ city: toTitleCase(h.city), weight: 10, type: 'hotel' })
    }
  }

  // Arrival airports (excluding common transit hubs that overlap with departures)
  const arrivals = {}
  const departures = {}
  for (const f of flights) {
    const a = f.arrival_airport_code?.toUpperCase()
    const d = f.departure_airport_code?.toUpperCase()
    if (a && AIRPORT_CITY[a]) {
      arrivals[a] = (arrivals[a] || 0) + 1
      candidates.push({ city: AIRPORT_CITY[a], weight: 2, type: 'arrival' })
    }
    if (d && AIRPORT_CITY[d]) {
      departures[d] = (departures[d] || 0) + 1
    }
  }

  // Departure airports (low weight, only count if not equally an arrival hub)
  for (const f of flights) {
    const d = f.departure_airport_code?.toUpperCase()
    if (d && AIRPORT_CITY[d]) {
      candidates.push({ city: AIRPORT_CITY[d], weight: 1, type: 'departure' })
    }
  }

  // Weighted frequency
  const scores = {}
  for (const c of candidates) {
    scores[c.city] = (scores[c.city] || 0) + c.weight
  }

  let best = null, bestScore = 0
  for (const [city, score] of Object.entries(scores)) {
    if (score > bestScore) { best = city; bestScore = score }
  }
  return best
}

async function main() {
  const { data: allTrips, error: tripsErr } = await supabase
    .from('trips').select('id, name, cover_image_url')
  if (tripsErr) { console.error('Error:', tripsErr); return }

  const pending = allTrips.filter(t => !t.cover_image_url)
  console.log(`Pending: ${pending.length} trips`)

  let success = 0, skipped = 0
  for (let i = 0; i < pending.length; i++) {
    const trip = pending[i]
    console.log(`\n[${i + 1}/${pending.length}] "${trip.name}"`)

    const { data: flights } = await supabase
      .from('flights').select('departure_airport_code, arrival_airport_code')
      .eq('trip_id', trip.id)
    const { data: hotels } = await supabase
      .from('hotels').select('city')
      .eq('trip_id', trip.id)

    const city = inferMainCity(flights || [], hotels || [])
    if (!city) { console.log('  → Could not infer city'); skipped++; continue }
    console.log(`  → ${city}`)

    const photo = await fetchCityPhoto(city)
    if (!photo) { console.log('  → No photo'); skipped++; continue }

    const { error: err } = await supabase
      .from('trips').update({ cover_image_url: photo }).eq('id', trip.id)
    if (err) { console.error('  → Error:', err) }
    else { console.log('  ✓'); success++ }

    await sleep(4000)
  }
  console.log(`\nDone! ${success} updated, ${skipped} skipped`)
}

main()
