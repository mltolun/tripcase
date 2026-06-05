import { clsx, type ClassValue } from 'clsx'
import { parseISO, differenceInDays } from 'date-fns'

export const AIRPORT_TZ: Record<string, string> = {
  JFK: 'America/New_York', LGA: 'America/New_York', EWR: 'America/New_York',
  BOS: 'America/New_York', DCA: 'America/New_York', IAD: 'America/New_York',
  PHL: 'America/New_York', CLT: 'America/New_York', ATL: 'America/New_York',
  MIA: 'America/New_York', TPA: 'America/New_York', MCO: 'America/New_York',
  DTW: 'America/New_York', ORD: 'America/Chicago', MDW: 'America/Chicago',
  DFW: 'America/Chicago', IAH: 'America/Chicago', MSP: 'America/Chicago',
  DEN: 'America/Denver', PHX: 'America/Phoenix', SLC: 'America/Denver',
  SEA: 'America/Los_Angeles', PDX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles', LAX: 'America/Los_Angeles', SAN: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles', HNL: 'Pacific/Honolulu', SJD: 'America/Mazatlan',
  LHR: 'Europe/London', LGW: 'Europe/London', CDG: 'Europe/Paris',
  AMS: 'Europe/Amsterdam', FRA: 'Europe/Berlin', MUC: 'Europe/Berlin',
  FCO: 'Europe/Rome', MXP: 'Europe/Rome', BCN: 'Europe/Madrid',
  MAD: 'Europe/Madrid', ZRH: 'Europe/Zurich', VIE: 'Europe/Vienna',
  CPH: 'Europe/Copenhagen', ARN: 'Europe/Stockholm', OSL: 'Europe/Oslo',
  HEL: 'Europe/Helsinki', DUB: 'Europe/Dublin', BRU: 'Europe/Brussels',
  LIS: 'Europe/Lisbon', ATH: 'Europe/Athens', IST: 'Europe/Istanbul',
  HND: 'Asia/Tokyo', NRT: 'Asia/Tokyo', ICN: 'Asia/Seoul',
  PVG: 'Asia/Shanghai', PEK: 'Asia/Shanghai', HKG: 'Asia/Hong_Kong',
  SIN: 'Asia/Singapore', BKK: 'Asia/Bangkok', DEL: 'Asia/Kolkata',
  BOM: 'Asia/Kolkata', DXB: 'Asia/Dubai',
  SYD: 'Australia/Sydney', MEL: 'Australia/Sydney', AKL: 'Pacific/Auckland',
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(dateStr: string, fmt = 'EEE, MMM d', airportCode?: string | null) {
  try {
    if (airportCode && AIRPORT_TZ[airportCode]) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        const tz = AIRPORT_TZ[airportCode]
        if (fmt === 'EEE, MMM d') {
          return d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
        }
        if (fmt === 'EEE d MMM') {
          return d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' })
        }
        return d.toLocaleDateString('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      }
    }
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

export function compareTimes(actual: string, scheduled: string | null): 'early' | 'delayed' | 'on-time' | null {
  if (!scheduled) return null
  const a = new Date(actual).getTime()
  const s = new Date(scheduled).getTime()
  if (isNaN(a) || isNaN(s)) return null
  const diff = a - s
  if (Math.abs(diff) < 60000) return 'on-time'
  return diff < 0 ? 'early' : 'delayed'
}

export function formatTime(dateStr: string, airportCode?: string | null) {
  try {
    if (/^(\d{2}:\d{2})$/.test(dateStr)) return dateStr
    if (airportCode && AIRPORT_TZ[airportCode]) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { timeZone: AIRPORT_TZ[airportCode], hour: '2-digit', minute: '2-digit', hour12: false })
      }
    }
    const m = dateStr.match(/T(\d{2}:\d{2})/)
    return m ? m[1] : dateStr
  } catch { return dateStr }
}

export function formatDuration(startStr: string, endStr: string) {
  try {
    const ensureZ = (s: string) => /[Zz+-]/.test(s) ? s : s + 'Z'
    const start = new Date(ensureZ(startStr))
    const end = new Date(ensureZ(endStr))
    const mins = Math.round((end.getTime() - start.getTime()) / 60000)
    if (mins <= 0) return '--'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  } catch { return '--' }
}

export function formatDurationMinutes(totalMinutes: number | null | undefined) {
  if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes <= 0) return '--'
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
  'in air': 'text-emerald-400 bg-emerald-400/10',
  'en route': 'text-emerald-400 bg-emerald-400/10',
  departed: 'text-emerald-400 bg-emerald-400/10',
  approaching: 'text-emerald-400 bg-emerald-400/10',
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


