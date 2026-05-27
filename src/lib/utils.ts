import { clsx, type ClassValue } from 'clsx'
import { format, parseISO, differenceInMinutes, differenceInDays } from 'date-fns'

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

export function formatDuration(startStr: string, endStr: string, startLocal?: string | null, endLocal?: string | null) {
  try {
    const ensureZ = (s: string) => /[Zz+-]/.test(s) ? s : s + 'Z'
    const start = new Date(ensureZ(startStr))
    const end = new Date(ensureZ(endStr))

    if (startLocal && endLocal) {
      const [sh, sm] = startLocal.split(':').map(Number)
      const [eh, em] = endLocal.split(':').map(Number)
      const startLocalMin = sh * 60 + sm
      const endLocalMin = eh * 60 + em
      const startUtcMin = start.getUTCHours() * 60 + start.getUTCMinutes()
      const endUtcMin = end.getUTCHours() * 60 + end.getUTCMinutes()

      const norm = (o: number) => {
        if (o > 720) o -= 1440
        if (o < -720) o += 1440
        return o
      }
      const startOffset = norm(startUtcMin - startLocalMin)
      const endOffset = norm(endUtcMin - endLocalMin)

      let localDiff = endLocalMin - startLocalMin
      if (localDiff < 0) localDiff += 1440

      let mins = localDiff + (endOffset - startOffset)
      if (mins < 0) mins += 1440
      if (mins >= 1440) mins -= 1440

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
