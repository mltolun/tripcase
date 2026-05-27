import { clsx, type ClassValue } from 'clsx'
import { format, parseISO, differenceInDays } from 'date-fns'

const AIRPORT_TZ: Record<string, string> = {
  JFK: 'America/New_York', LGA: 'America/New_York', EWR: 'America/New_York',
  BOS: 'America/New_York', DCA: 'America/New_York', IAD: 'America/New_York',
  PHL: 'America/New_York', CLT: 'America/New_York', ATL: 'America/New_York',
  MIA: 'America/New_York', TPA: 'America/New_York', MCO: 'America/New_York',
  DTW: 'America/New_York', YYZ: 'America/Toronto', YUL: 'America/Toronto',
  ORD: 'America/Chicago', MDW: 'America/Chicago', DFW: 'America/Chicago',
  IAH: 'America/Chicago', MSP: 'America/Chicago', STL: 'America/Chicago',
  MEM: 'America/Chicago', DEN: 'America/Denver', PHX: 'America/Phoenix',
  SLC: 'America/Denver', SEA: 'America/Los_Angeles', PDX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles', LAX: 'America/Los_Angeles', SAN: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles', OAK: 'America/Los_Angeles', SMF: 'America/Los_Angeles',
  ANC: 'America/Anchorage', HNL: 'Pacific/Honolulu',
  LHR: 'Europe/London', LGW: 'Europe/London', STN: 'Europe/London',
  LTN: 'Europe/London', SEN: 'Europe/London', LCY: 'Europe/London',
  CDG: 'Europe/Paris', ORY: 'Europe/Paris', AMS: 'Europe/Amsterdam',
  FRA: 'Europe/Berlin', MUC: 'Europe/Berlin', TXL: 'Europe/Berlin',
  FCO: 'Europe/Rome', MXP: 'Europe/Rome', BCN: 'Europe/Madrid',
  MAD: 'Europe/Madrid', ZRH: 'Europe/Zurich', VIE: 'Europe/Vienna',
  CPH: 'Europe/Copenhagen', ARN: 'Europe/Stockholm', OSL: 'Europe/Oslo',
  HEL: 'Europe/Helsinki', DUB: 'Europe/Dublin', BRU: 'Europe/Brussels',
  LIS: 'Europe/Lisbon', ATH: 'Europe/Athens', IST: 'Europe/Istanbul',
  HND: 'Asia/Tokyo', NRT: 'Asia/Tokyo', KIX: 'Asia/Tokyo',
  ICN: 'Asia/Seoul', PVG: 'Asia/Shanghai', PEK: 'Asia/Shanghai',
  HKG: 'Asia/Hong_Kong', SIN: 'Asia/Singapore', BKK: 'Asia/Bangkok',
  DEL: 'Asia/Kolkata', BOM: 'Asia/Kolkata', DXB: 'Asia/Dubai',
  SYD: 'Australia/Sydney', MEL: 'Australia/Sydney', BNE: 'Australia/Brisbane',
  AKL: 'Pacific/Auckland', NAN: 'Pacific/Fiji',
}

function getAirportOffset(airportCode: string, date: Date): number {
  const tzName = AIRPORT_TZ[airportCode]
  if (!tzName) return NaN
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tzName, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  return (utcMs - localMs) / 60000
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(dateStr: string, fmt = 'EEE, MMM d') {
  try {
    const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    if (fmt === 'EEE, MMM d') {
      return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}`
    }
    if (fmt === 'EEE d MMM') {
      return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`
    }
    return dateStr.slice(0, 10)
  } catch { return dateStr }
}

export function formatTime(dateStr: string) {
  try {
    if (/^(\d{2}:\d{2})$/.test(dateStr)) return dateStr
    return format(parseISO(dateStr), 'HH:mm')
  } catch { return dateStr }
}

export function formatDuration(
  startStr: string,
  endStr: string,
  startLocal?: string | null,
  endLocal?: string | null,
  depAirport?: string | null,
  arrAirport?: string | null,
) {
  try {
    const ensureZ = (s: string) => /[Zz+-]/.test(s) ? s : s + 'Z'
    const start = new Date(ensureZ(startStr))
    const end = new Date(ensureZ(endStr))

    if (startLocal && endLocal) {
      const [sh, sm] = startLocal.split(':').map(Number)
      const [eh, em] = endLocal.split(':').map(Number)
      const startLocalMin = sh * 60 + sm
      const endLocalMin = eh * 60 + em

      let startOffset = getAirportOffset(depAirport ?? '', start)
      let endOffset = getAirportOffset(arrAirport ?? '', end)

      if (isNaN(startOffset) || isNaN(endOffset)) {
        const startUtcMin = start.getUTCHours() * 60 + start.getUTCMinutes()
        const endUtcMin = end.getUTCHours() * 60 + end.getUTCMinutes()
        const norm = (o: number) => {
          if (o > 720) o -= 1440
          if (o < -720) o += 1440
          return o
        }
        startOffset = norm(startUtcMin - startLocalMin)
        endOffset = norm(endUtcMin - endLocalMin)
      }

      let startUtcMin = startLocalMin + startOffset
      let endUtcMin = endLocalMin + endOffset
      if (endUtcMin <= startUtcMin) endUtcMin += 1440

      const mins = endUtcMin - startUtcMin
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${h}h ${m}m`
    }

    const mins = Math.round((end.getTime() - start.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  } catch { return '--' }
}

export function formatDurationMinutes(totalMinutes: number | null | undefined) {
  if (totalMinutes == null || isNaN(totalMinutes)) return '--'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${m}m`
}

export function nightsBetween(start: string, end: string) {
  try {
    return differenceInDays(parseISO(end), parseISO(start))
  } catch { return 0 }
}

export { airlineLogoUrl } from './airlines'

export const FLIGHT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-sky-400 bg-sky-400/10',
  active: 'text-emerald-400 bg-emerald-400/10',
  landed: 'text-slate-400 bg-slate-400/10',
  cancelled: 'text-rose-400 bg-rose-400/10',
  delayed: 'text-amber-400 bg-amber-400/10',
  diverted: 'text-amber-400 bg-amber-400/10',
  unknown: 'text-slate-400 bg-slate-400/10',
}

export function generateShareToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function fetchCityPhoto(city: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: city.trim(), prop: 'pageimages', pithumbsize: '800' })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`)
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages as Record<string, any>)[0]
    return page?.thumbnail?.source ?? null
  } catch { return null }
}

export function localDateStr(utcTimestamp: string, localTime: string | null) {
  if (!localTime) return utcTimestamp.slice(0, 10)
  try {
    const utc = new Date(utcTimestamp)
    const [lh, lm] = localTime.split(':').map(Number)
    const [uh, um] = [utc.getUTCHours(), utc.getUTCMinutes()]
    let offsetMin = (lh * 60 + lm) - (uh * 60 + um)
    if (offsetMin > 720) offsetMin -= 1440
    if (offsetMin < -720) offsetMin += 1440
    const local = new Date(utc.getTime() + offsetMin * 60000)
    return local.toISOString().slice(0, 10)
  } catch {
    return utcTimestamp.slice(0, 10)
  }
}
