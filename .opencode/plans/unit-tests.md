# Unit Test Implementation Plan

## Status: Not implemented (plan mode active)

## Steps to Execute

### 1. Update `vite.config.ts`
Add vitest config with `/// <reference types="vitest" />` directive and `test` block:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
})
```

### 2. Update `package.json` scripts
Add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 3. Create `src/__tests__/timezone.test.ts`
Migrate from `scripts/test-timezone.mjs` + add `utcToLocalDate` tests:
- `getAirportOffset`: MAD June (+2), LHR June (+1), SAN June (-7), PHX June (-7 no DST), HNL June (-10), unknown airport (0), winter time (MAD Jan +1)
- `localToUtc`: MAD 09:10→07:10Z, LHR 12:30→11:30Z, SAN 10:35→17:35Z, PHX 10:00→17:00Z, SFO 23:00→06:00Z next day, LHR 01:30→00:30Z, MAD Jan 09:10→08:10Z, already-Z strings pass-through, +/-offset pass-through, -00:00 treated as local, +00:00 treated as local, no airport appends Z
- `utcToLocalDate`: SAN June 13 02:40Z → June 12 (the bug fix), MAD June 06 07:10Z → June 06, LHR June 06 11:30Z → June 06, SFO June 07 06:00Z → June 06 (cross-midnight), no airport returns UTC date
- `parseScheduledTime`: valid format "09:10, Jun 6", invalid format, null input
- `formatTime`: MAD 07:10Z→09:10, LHR 11:30Z→12:30, SAN 17:35Z→10:35
- Round-trip integration: MAD 09:10, LHR 12:30, SAN 10:35

### 4. Create `src/__tests__/utils.test.ts`
Import from `src/lib/utils.ts`:
- `cn()`: single class, multiple classes, conditional with clsx, empty
- `formatDate()`: UTC fallback (no airport), SAN timezone-aware (June 12 19:40 PDT → "Fri, Jun 12"), UK format "EEE d MMM", LHR timezone, null/empty handling
- `formatTime()`: plain time string pass-through, SAN timezone-aware, LHR timezone-aware, UTC fallback regex extraction, invalid input
- `compareTimes()`: on-time (<1min diff), delayed (>1min late), early (>1min early), null scheduled, invalid dates
- `formatDuration()`: normal duration, same time (0 min), negative duration, Z and non-Z input
- `formatDurationMinutes()`: normal, null/undefined/NaN, zero/negative
- `nightsBetween()`: same day (0), consecutive nights (1), multiple nights, invalid dates
- `generateShareToken()`: correct length (32 hex chars), hexadecimal only
- `fetchCityPhoto()`: (needs vitest fetch mock) returns URL on success, null on failure
- `FLIGHT_STATUS_COLORS`: all expected status keys present

### 5. Create `src/__tests__/airlines.test.ts`
Import from `src/lib/airlines.ts`:
- `searchAirlines()`: by name "American", by IATA "AA", by country "US", empty query returns [], case insensitive, max 8 results, partial match "elta"
- `airlineLogoUrl()`: correct URL format for given IATA

### 6. Create `src/__tests__/airports.test.ts`
Import from `src/lib/airports.ts`:
- `getAirportCoords()`: SAN (32.7336, -117.1933), LHR (51.4700, -0.4543), MAD (40.4894, -3.5691), NRT (35.7653, 140.3865), unknown "XYZ" returns null, case insensitive ("san")

### 7. Create `src/__tests__/geo.test.ts`
Import from `src/lib/geo.ts`:
- `haversineKm()`: SAN→LHR ~8740km, JFK→LHR ~5540km, same point 0km, small distance, equator points
- `toRad()`: not exported, test via haversine

### 8. Create `src/__tests__/flightApi.test.ts`
Import from `src/lib/flightApi.ts`:
- `parseFlightNumber()`: "IB3615" → {airline:"IB", number:"3615"}, "AA100" → {airline:"AA", number:"100"}, "U26001" → {airline:"U2", number:"6001"}, "BA1" → {airline:"BA", number:"1"}, "XXX" (no digits) → null, "" (empty) → null, "123" (no letters) → null, "  AA100  " (whitespace) → {airline:"AA", number:"100"}
- `lookupFlight`: (requires supabase mock, defer to later phase)

### 9. Verify
Run `npx vitest run` and `npm run build` to confirm no regressions.

## Files to Create/Modify
- Modify: `vite.config.ts`
- Modify: `package.json`
- Create: `src/__tests__/timezone.test.ts`
- Create: `src/__tests__/utils.test.ts`
- Create: `src/__tests__/airlines.test.ts`
- Create: `src/__tests__/airports.test.ts`
- Create: `src/__tests__/geo.test.ts`
- Create: `src/__tests__/flightApi.test.ts`
