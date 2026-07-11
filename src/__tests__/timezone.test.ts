import { describe, it, expect } from 'vitest'

const AIRPORT_TZ: Record<string, string> = {
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

function getAirportOffset(airportCode: string, date: Date): number {
  const tzName = AIRPORT_TZ[airportCode]
  if (!tzName) return 0
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tzName, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  let hour = get('hour')
  if (hour === 24) hour = 0
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  return (utcMs - localMs) / 60000
}

function localToUtc(localIso: string, airportCode: string | null): string {
  const hasTz = /[Zz]|[+-]\d{2}:\d{2}$/.test(localIso)
  const isNegZero = /-00:00$/.test(localIso)
  const d = new Date(hasTz ? localIso : localIso + 'Z')
  // -00:00 means local time with unknown offset (FlightView convention).
  // +00:00 and Z mean UTC — return as-is.
  if ((hasTz && !isNegZero) || !airportCode || isNaN(d.getTime())) return d.toISOString()
  const offset = getAirportOffset(airportCode, d)
  return new Date(d.getTime() + offset * 60000).toISOString()
}

function utcToLocalDate(utcIso: string, airportCode: string | null): string | undefined {
  if (!utcIso || !airportCode) return utcIso?.slice(0, 10)
  const d = new Date(utcIso)
  if (isNaN(d.getTime())) return utcIso.slice(0, 10)
  const offset = getAirportOffset(airportCode, d)
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

function formatTime(dateStr: string, airportCode?: string | null) {
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

function parseScheduledTime(scheduledStr: string | null, airportCode: string | null, fallbackDate: string): string | null {
  if (!scheduledStr || !airportCode) return null
  const m = scheduledStr.match(/^(\d{2}:\d{2}),\s*(\w{3})\s*(\d{1,2})$/)
  if (!m) return null
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6,
    aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }
  const month = months[m[2].toLowerCase().slice(0, 3)]
  if (month === undefined) return null
  const year = new Date(fallbackDate + 'T00:00:00').getFullYear()
  const localIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(parseInt(m[3], 10)).padStart(2, '0')}T${m[1]}:00`
  return localToUtc(localIso, airportCode)
}

describe('getAirportOffset', () => {
  it('MAD in June (CEST, UTC+2)', () => {
    const d = new Date('2026-06-06T09:10:00Z')
    expect(getAirportOffset('MAD', d)).toBe(-120)
  })

  it('LHR in June (BST, UTC+1)', () => {
    const d = new Date('2026-06-06T12:30:00Z')
    expect(getAirportOffset('LHR', d)).toBe(-60)
  })

  it('SAN in June (PDT, UTC-7)', () => {
    const d = new Date('2026-06-06T10:35:00Z')
    expect(getAirportOffset('SAN', d)).toBe(420)
  })

  it('PHX in June (MST, UTC-7, no DST)', () => {
    const d = new Date('2026-06-06T10:00:00Z')
    expect(getAirportOffset('PHX', d)).toBe(420)
  })

  it('HNL in June (HST, UTC-10)', () => {
    const d = new Date('2026-06-06T10:00:00Z')
    expect(getAirportOffset('HNL', d)).toBe(600)
  })

  it('MAD in January (CET, UTC+1)', () => {
    const d = new Date('2026-01-06T09:10:00Z')
    expect(getAirportOffset('MAD', d)).toBe(-60)
  })

  it('Unknown airport returns 0', () => {
    const d = new Date('2026-06-06T09:10:00Z')
    expect(getAirportOffset('XYZ', d)).toBe(0)
  })
})

describe('localToUtc', () => {
  it('MAD local 09:10 (CEST, UTC+2) -> 07:10 UTC', () => {
    expect(localToUtc('2026-06-06T09:10:00', 'MAD')).toBe('2026-06-06T07:10:00.000Z')
  })

  it('LHR local 12:30 (BST, UTC+1) -> 11:30 UTC', () => {
    expect(localToUtc('2026-06-06T12:30:00', 'LHR')).toBe('2026-06-06T11:30:00.000Z')
  })

  it('SAN local 10:35 (PDT, UTC-7) -> 17:35 UTC', () => {
    expect(localToUtc('2026-06-06T10:35:00', 'SAN')).toBe('2026-06-06T17:35:00.000Z')
  })

  it('String already with Z is returned as-is', () => {
    expect(localToUtc('2026-06-06T07:10:00.000Z', 'MAD')).toBe('2026-06-06T07:10:00.000Z')
  })

  it('String with offset is returned as-is', () => {
    expect(localToUtc('2026-06-06T09:10:00+02:00', 'MAD')).toBe('2026-06-06T07:10:00.000Z')
  })

  it('No airport code -> appended Z as-is', () => {
    expect(localToUtc('2026-06-06T09:10:00', null)).toBe('2026-06-06T09:10:00.000Z')
  })

  it('FlightView -00:00 MAD 09:10 -> 07:10 UTC', () => {
    expect(localToUtc('2026-06-06T09:10:00.000-00:00', 'MAD')).toBe('2026-06-06T07:10:00.000Z')
  })

  it('FlightView -00:00 LHR 12:30 -> 11:30 UTC', () => {
    expect(localToUtc('2026-06-06T12:30:00-00:00', 'LHR')).toBe('2026-06-06T11:30:00.000Z')
  })

  it('FlightView +00:00 treated as UTC (no conversion)', () => {
    expect(localToUtc('2026-06-06T09:10:00.000+00:00', 'MAD')).toBe('2026-06-06T09:10:00.000Z')
  })

  it('PHX local 10:00 (MST, UTC-7) -> 17:00 UTC', () => {
    expect(localToUtc('2026-06-06T10:00:00', 'PHX')).toBe('2026-06-06T17:00:00.000Z')
  })

  it('SFO local 23:00 (PDT, UTC-7) -> 06:00 UTC next day', () => {
    expect(localToUtc('2026-06-06T23:00:00', 'SFO')).toBe('2026-06-07T06:00:00.000Z')
  })

  it('LHR local 01:30 -> 00:30 UTC', () => {
    expect(localToUtc('2026-06-06T01:30:00', 'LHR')).toBe('2026-06-06T00:30:00.000Z')
  })

  it('MAD local 09:10 in January (CET, UTC+1) -> 08:10 UTC', () => {
    expect(localToUtc('2026-01-06T09:10:00', 'MAD')).toBe('2026-01-06T08:10:00.000Z')
  })

  it('Non-zero offset string with airport applies conversion', () => {
    const result = localToUtc('2026-06-06T09:10:00+02:00', 'MAD')
    expect(result).toBe('2026-06-06T07:10:00.000Z')
  })
})

describe('utcToLocalDate', () => {
  it('SAN June 13 02:40Z -> June 12 (bug fix: IB3615 SAN departure)', () => {
    expect(utcToLocalDate('2026-06-13T02:40:00Z', 'SAN')).toBe('2026-06-12')
  })

  it('MAD June 06 07:10Z -> June 06', () => {
    expect(utcToLocalDate('2026-06-06T07:10:00Z', 'MAD')).toBe('2026-06-06')
  })

  it('LHR June 06 11:30Z -> June 06', () => {
    expect(utcToLocalDate('2026-06-06T11:30:00Z', 'LHR')).toBe('2026-06-06')
  })

  it('SFO June 07 06:00Z -> June 06 (cross-midnight)', () => {
    expect(utcToLocalDate('2026-06-07T06:00:00Z', 'SFO')).toBe('2026-06-06')
  })

  it('No airport code returns UTC date', () => {
    expect(utcToLocalDate('2026-06-13T02:40:00Z', null)).toBe('2026-06-13')
  })

  it('Null input returns undefined', () => {
    expect(utcToLocalDate('', 'SAN')).toBe('')
  })
})

describe('formatTime', () => {
  it('MAD 07:10Z displays as 09:10', () => {
    expect(formatTime('2026-06-06T07:10:00.000Z', 'MAD')).toBe('09:10')
  })

  it('LHR 11:30Z displays as 12:30', () => {
    expect(formatTime('2026-06-06T11:30:00.000Z', 'LHR')).toBe('12:30')
  })

  it('SAN 17:35Z displays as 10:35', () => {
    expect(formatTime('2026-06-06T17:35:00.000Z', 'SAN')).toBe('10:35')
  })

  it('Plain time string passes through', () => {
    expect(formatTime('09:10')).toBe('09:10')
  })

  it('No airport code falls back to regex extraction', () => {
    expect(formatTime('2026-06-06T07:10:00.000Z')).toBe('07:10')
  })

  it('Empty string returns empty', () => {
    expect(formatTime('')).toBe('')
  })
})

describe('parseScheduledTime', () => {
  it('Parses "09:10, Jun 6" with MAD -> 07:10 UTC', () => {
    const result = parseScheduledTime('09:10, Jun 6', 'MAD', '2026-06-06')
    expect(result).toBe('2026-06-06T07:10:00.000Z')
  })

  it('Parses "12:30, Jun 06" with LHR -> 11:30 UTC', () => {
    const result = parseScheduledTime('12:30, Jun 06', 'LHR', '2026-06-06')
    expect(result).toBe('2026-06-06T11:30:00.000Z')
  })

  it('Null input returns null', () => {
    expect(parseScheduledTime(null, 'MAD', '2026-06-06')).toBeNull()
  })

  it('No airport code returns null', () => {
    expect(parseScheduledTime('09:10, Jun 6', null, '2026-06-06')).toBeNull()
  })

  it('Invalid format returns null', () => {
    expect(parseScheduledTime('invalid', 'MAD', '2026-06-06')).toBeNull()
  })
})

describe('Round-trip integration', () => {
  function roundTrip(airportCode: string, localIso: string) {
    const utcIso = localToUtc(localIso, airportCode)
    const displayed = formatTime(utcIso, airportCode)
    const expectedTime = localIso.match(/T(\d{2}:\d{2})/)![1]
    return { displayed, expectedTime, utcIso }
  }

  it('IB0715 MAD 09:10 round-trip', () => {
    const r = roundTrip('MAD', '2026-06-06T09:10:00')
    expect(r.displayed).toBe('09:10')
    expect(r.utcIso).toBe('2026-06-06T07:10:00.000Z')
  })

  it('IB3616 LHR 12:30 round-trip', () => {
    const r = roundTrip('LHR', '2026-06-06T12:30:00')
    expect(r.displayed).toBe('12:30')
    expect(r.utcIso).toBe('2026-06-06T11:30:00.000Z')
  })

  it('AS1406 SAN 10:35 round-trip', () => {
    const r = roundTrip('SAN', '2026-06-07T10:35:00')
    expect(r.displayed).toBe('10:35')
    expect(r.utcIso).toBe('2026-06-07T17:35:00.000Z')
  })
})
