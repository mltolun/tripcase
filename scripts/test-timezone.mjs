// Test the timezone logic used in the edge function.
// Run: node scripts/test-timezone.mjs

const AIRPORT_TZ = {
  JFK: 'America/New_York', LGA: 'America/New_York', EWR: 'America/New_York',
  BOS: 'America/New_York', DCA: 'America/New_York', IAD: 'America/New_York',
  PHL: 'America/New_York', CLT: 'America/New_York', ATL: 'America/New_York',
  MIA: 'America/New_York', TPA: 'America/New_York', MCO: 'America/New_York',
  DTW: 'America/New_York', ORD: 'America/Chicago', MDW: 'America/Chicago',
  DFW: 'America/Chicago', IAH: 'America/Chicago', MSP: 'America/Chicago',
  DEN: 'America/Denver', PHX: 'America/Phoenix', SLC: 'America/Denver',
  SEA: 'America/Los_Angeles', PDX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles', LAX: 'America/Los_Angeles', SAN: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles', HNL: 'Pacific/Honolulu',
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

function getAirportOffset(airportCode, date) {
  const tzName = AIRPORT_TZ[airportCode]
  if (!tzName) return 0
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tzName, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date)
  const get = (t) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
  return (utcMs - localMs) / 60000
}

function localToUtc(localIso, airportCode) {
  const hasTz = /[Zz]|[+-]\d{2}:\d{2}$/.test(localIso)
  const isZeroOffset = /[+-]00:00$/.test(localIso)
  const d = new Date(hasTz ? localIso : localIso + 'Z')
  if ((hasTz && !isZeroOffset) || !airportCode || isNaN(d.getTime())) return d
  const offset = getAirportOffset(airportCode, d)
  return new Date(d.getTime() + offset * 60000)
}

function formatTime(dateStr, airportCode) {
  try {
    if (/^(\d{2}:\d{2})$/.test(dateStr)) return dateStr
    if (airportCode && AIRPORT_TZ[airportCode]) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', {
          timeZone: AIRPORT_TZ[airportCode], hour: '2-digit', minute: '2-digit', hour12: false
        })
      }
    }
    const m = dateStr.match(/T(\d{2}:\d{2})/)
    return m ? m[1] : dateStr
  } catch { return dateStr }
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
    failed++
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected "${expected}", got "${actual}"`)
  }
}

function assertClose(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}±${tolerance}, got ${actual}`)
  }
}

console.log('\n=== getAirportOffset tests ===')

test('MAD in June (CEST, UTC+2)', () => {
  const d = new Date('2026-06-06T09:10:00Z')
  const offset = getAirportOffset('MAD', d)
  // 09:10 UTC displayed in Madrid = 11:10, so offset = (09:10 - 11:10) = -120min
  assertEqual(offset, -120, 'MAD June offset')
})

test('LHR in June (BST, UTC+1)', () => {
  const d = new Date('2026-06-06T12:30:00Z')
  const offset = getAirportOffset('LHR', d)
  assertEqual(offset, -60, 'LHR June offset')
})

test('SAN in June (PDT, UTC-7)', () => {
  const d = new Date('2026-06-06T10:35:00Z')
  const offset = getAirportOffset('SAN', d)
  assertEqual(offset, 420, 'SAN June offset')
})

test('PHX in June (MST, UTC-7, no DST)', () => {
  const d = new Date('2026-06-06T10:00:00Z')
  const offset = getAirportOffset('PHX', d)
  assertEqual(offset, 420, 'PHX June offset')
})

test('HNL in June (HST, UTC-10)', () => {
  const d = new Date('2026-06-06T10:00:00Z')
  const offset = getAirportOffset('HNL', d)
  assertEqual(offset, 600, 'HNL June offset')
})

// Unknown airport should return 0 offset
test('Unknown airport returns 0', () => {
  const d = new Date('2026-06-06T09:10:00Z')
  const offset = getAirportOffset('XYZ', d)
  assertEqual(offset, 0, 'Unknown airport')
})

console.log('\n=== localToUtc tests ===')

test('MAD local 09:10 (CEST, UTC+2) -> 07:10 UTC', () => {
  const result = localToUtc('2026-06-06T09:10:00', 'MAD')
  assertEqual(result.toISOString(), '2026-06-06T07:10:00.000Z', 'MAD conversion')
})

test('LHR local 12:30 (BST, UTC+1) -> 11:30 UTC', () => {
  const result = localToUtc('2026-06-06T12:30:00', 'LHR')
  assertEqual(result.toISOString(), '2026-06-06T11:30:00.000Z', 'LHR conversion')
})

test('SAN local 10:35 (PDT, UTC-7) -> 17:35 UTC', () => {
  const result = localToUtc('2026-06-06T10:35:00', 'SAN')
  assertEqual(result.toISOString(), '2026-06-06T17:35:00.000Z', 'SAN conversion')
})

test('String already with Z is returned as-is', () => {
  const result = localToUtc('2026-06-06T07:10:00.000Z', 'MAD')
  assertEqual(result.toISOString(), '2026-06-06T07:10:00.000Z', 'Already UTC')
})

test('String with offset is returned as-is', () => {
  const result = localToUtc('2026-06-06T09:10:00+02:00', 'MAD')
  assertEqual(result.toISOString(), '2026-06-06T07:10:00.000Z', 'With offset')
})

test('No airport code -> appended Z as-is', () => {
  const result = localToUtc('2026-06-06T09:10:00', null)
  assertEqual(result.toISOString(), '2026-06-06T09:10:00.000Z', 'No airport')
})

// FlightView returns -00:00 offset for local times (unknown offset)
test('FlightView -00:00 MAD 09:10 -> 07:10 UTC', () => {
  const result = localToUtc('2026-06-06T09:10:00.000-00:00', 'MAD')
  assertEqual(result.toISOString(), '2026-06-06T07:10:00.000Z', 'FlightView -00:00 MAD')
})

test('FlightView -00:00 LHR 12:30 -> 11:30 UTC', () => {
  const result = localToUtc('2026-06-06T12:30:00-00:00', 'LHR')
  assertEqual(result.toISOString(), '2026-06-06T11:30:00.000Z', 'FlightView -00:00 LHR')
})

test('FlightView +00:00 treated same as -00:00', () => {
  const result = localToUtc('2026-06-06T09:10:00.000+00:00', 'MAD')
  assertEqual(result.toISOString(), '2026-06-06T07:10:00.000Z', 'FlightView +00:00 MAD')
})

test('PHX local 10:00 (MST, UTC-7) -> 17:00 UTC', () => {
  const result = localToUtc('2026-06-06T10:00:00', 'PHX')
  assertEqual(result.toISOString(), '2026-06-06T17:00:00.000Z', 'PHX conversion')
})

// Edge case: local time near midnight (date boundaries)
test('SFO local 23:00 (PDT, UTC-7) -> 06:00 UTC next day', () => {
  const result = localToUtc('2026-06-06T23:00:00', 'SFO')
  assertEqual(result.toISOString(), '2026-06-07T06:00:00.000Z', 'SFO midnight crossing')
})

// Edge case: local time just after midnight
test('LHR local 01:30 -> 00:30 UTC', () => {
  const result = localToUtc('2026-06-06T01:30:00', 'LHR')
  assertEqual(result.toISOString(), '2026-06-06T00:30:00.000Z', 'LHR early morning')
})

// Winter time (CET instead of CEST)
test('MAD local 09:10 in January (CET, UTC+1) -> 08:10 UTC', () => {
  const result = localToUtc('2026-01-06T09:10:00', 'MAD')
  assertEqual(result.toISOString(), '2026-01-06T08:10:00.000Z', 'MAD winter conversion')
})

console.log('\n=== formatTime tests (display logic) ===')

test('Display MAD time from UTC string', () => {
  // 07:10 UTC should display as 09:10 in Madrid (CEST)
  const t = formatTime('2026-06-06T07:10:00.000Z', 'MAD')
  assertEqual(t, '09:10', 'MAD display')
})

test('Display LHR time from UTC string', () => {
  // 11:30 UTC should display as 12:30 in London (BST)
  const t = formatTime('2026-06-06T11:30:00.000Z', 'LHR')
  assertEqual(t, '12:30', 'LHR display')
})

test('Display SAN time from UTC string', () => {
  // 17:35 UTC should display as 10:35 in San Diego (PDT)
  const t = formatTime('2026-06-06T17:35:00.000Z', 'SAN')
  assertEqual(t, '10:35', 'SAN display')
})

// FULL INTEGRATION: localToUtc + formatTime roundtrip
console.log('\n=== Round-trip integration tests ===')

function roundTrip(airportCode, localIso) {
  const utcIso = localToUtc(localIso, airportCode).toISOString()
  const displayed = formatTime(utcIso, airportCode)
  const expectedTime = localIso.match(/T(\d{2}:\d{2})/)[1]
  return { utcIso, displayed, expectedTime }
}

test('IB0715 MAD 09:10 round-trip', () => {
  const r = roundTrip('MAD', '2026-06-06T09:10:00')
  assertEqual(r.displayed, '09:10', `Display should be 09:10, got ${r.displayed}`)
  assertEqual(r.utcIso, '2026-06-06T07:10:00.000Z', `UTC should be 07:10Z, got ${r.utcIso}`)
})

test('IB3616 LHR 12:30 round-trip', () => {
  const r = roundTrip('LHR', '2026-06-06T12:30:00')
  assertEqual(r.displayed, '12:30', `Display should be 12:30, got ${r.displayed}`)
  assertEqual(r.utcIso, '2026-06-06T11:30:00.000Z', `UTC should be 11:30Z, got ${r.utcIso}`)
})

test('AS1406 SAN 10:35 round-trip', () => {
  const r = roundTrip('SAN', '2026-06-07T10:35:00')
  assertEqual(r.displayed, '10:35', `Display should be 10:35, got ${r.displayed}`)
  assertEqual(r.utcIso, '2026-06-07T17:35:00.000Z', `UTC should be 17:35Z, got ${r.utcIso}`)
})

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
