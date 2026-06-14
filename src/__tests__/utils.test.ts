import { describe, it, expect } from 'vitest'

import {
  cn,
  formatDate,
  formatTime,
  compareTimes,
  formatDuration,
  formatDurationMinutes,
  nightsBetween,
  generateShareToken,
  FLIGHT_STATUS_COLORS,
} from '../lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('formatDate', () => {
  it('formats UTC date without airport code (EEE, MMM d)', () => {
    const result = formatDate('2026-06-12T00:00:00Z')
    expect(result).toBe('Fri, Jun 12')
  })

  it('formats SAN timezone-aware date', () => {
    const result = formatDate('2026-06-13T02:40:00Z', 'EEE, MMM d', 'SAN')
    expect(result).toBe('Fri, Jun 12')
  })

  it('formats LHR timezone-aware date', () => {
    const result = formatDate('2026-06-06T11:30:00Z', 'EEE, MMM d', 'LHR')
    expect(result).toBe('Sat, Jun 6')
  })

  it('formats UK-style (EEE d MMM)', () => {
    const result = formatDate('2026-06-12T00:00:00Z', 'EEE d MMM')
    expect(result).toBe('Fri 12 Jun')
  })

  it('handles invalid date string without throwing', () => {
    const result = formatDate('not-a-date')
    expect(typeof result).toBe('string')
  })
})

describe('formatTime', () => {
  it('returns plain time string as-is', () => {
    expect(formatTime('09:10')).toBe('09:10')
  })

  it('formats SAN time from UTC', () => {
    expect(formatTime('2026-06-13T02:40:00Z', 'SAN')).toBe('19:40')
  })

  it('formats LHR time from UTC', () => {
    expect(formatTime('2026-06-06T11:30:00Z', 'LHR')).toBe('12:30')
  })

  it('formats MAD time from UTC', () => {
    expect(formatTime('2026-06-06T07:10:00Z', 'MAD')).toBe('09:10')
  })

  it('falls back to regex extraction without airport', () => {
    expect(formatTime('2026-06-06T07:10:00.000Z')).toBe('07:10')
  })

  it('handles empty string', () => {
    expect(formatTime('')).toBe('')
  })
})

describe('compareTimes', () => {
  it('returns null when scheduled is null', () => {
    expect(compareTimes('2026-06-06T12:00:00Z', null)).toBeNull()
  })

  it('returns "on-time" when difference < 1 minute', () => {
    const actual = '2026-06-06T12:00:00Z'
    const scheduled = '2026-06-06T12:00:30Z'
    expect(compareTimes(actual, scheduled)).toBe('on-time')
  })

  it('returns "delayed" when actual is after scheduled', () => {
    const actual = '2026-06-06T12:05:00Z'
    const scheduled = '2026-06-06T12:00:00Z'
    expect(compareTimes(actual, scheduled)).toBe('delayed')
  })

  it('returns "early" when actual is before scheduled', () => {
    const actual = '2026-06-06T11:55:00Z'
    const scheduled = '2026-06-06T12:00:00Z'
    expect(compareTimes(actual, scheduled)).toBe('early')
  })

  it('returns null for invalid dates', () => {
    expect(compareTimes('invalid', '2026-06-06T12:00:00Z')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formats duration between two UTC timestamps', () => {
    const result = formatDuration('2026-06-06T12:00:00Z', '2026-06-06T15:30:00Z')
    expect(result).toBe('3h 30m')
  })

  it('handles non-Z timestamps', () => {
    const result = formatDuration('2026-06-06T12:00:00', '2026-06-06T14:15:00')
    expect(result).toBe('2h 15m')
  })

  it('returns "--" for zero duration', () => {
    const result = formatDuration('2026-06-06T12:00:00Z', '2026-06-06T12:00:00Z')
    expect(result).toBe('--')
  })

  it('handles invalid dates without throwing', () => {
    const result = formatDuration('invalid', '2026-06-06T12:00:00Z')
    expect(typeof result).toBe('string')
  })
})

describe('formatDurationMinutes', () => {
  it('formats minutes to human-readable', () => {
    expect(formatDurationMinutes(210)).toBe('3h 30m')
  })

  it('formats exact hours', () => {
    expect(formatDurationMinutes(120)).toBe('2h 0m')
  })

  it('returns "--" for null', () => {
    expect(formatDurationMinutes(null)).toBe('--')
  })

  it('returns "--" for undefined', () => {
    expect(formatDurationMinutes(undefined)).toBe('--')
  })

  it('returns "--" for NaN', () => {
    expect(formatDurationMinutes(NaN)).toBe('--')
  })

  it('returns "--" for zero', () => {
    expect(formatDurationMinutes(0)).toBe('--')
  })

  it('returns "--" for negative', () => {
    expect(formatDurationMinutes(-30)).toBe('--')
  })
})

describe('nightsBetween', () => {
  it('returns 0 for same day', () => {
    expect(nightsBetween('2026-06-12', '2026-06-12')).toBe(0)
  })

  it('returns 1 for consecutive nights', () => {
    expect(nightsBetween('2026-06-12', '2026-06-13')).toBe(1)
  })

  it('returns 3 for three-night stay', () => {
    expect(nightsBetween('2026-06-12', '2026-06-15')).toBe(3)
  })

  it('handles invalid dates without throwing', () => {
    const result = nightsBetween('invalid', '2026-06-12')
    expect(typeof result).toBe('number')
  })
})

describe('generateShareToken', () => {
  it('generates 32-character hex string', () => {
    const token = generateShareToken()
    expect(token).toHaveLength(32)
    expect(/^[0-9a-f]+$/.test(token)).toBe(true)
  })

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateShareToken()))
    expect(tokens.size).toBe(100)
  })
})

describe('FLIGHT_STATUS_COLORS', () => {
  it('has entries for all expected statuses', () => {
    const expected = ['scheduled', 'active', 'in air', 'en route', 'departed', 'approaching', 'landed', 'cancelled', 'delayed', 'diverted', 'unknown']
    for (const status of expected) {
      expect(FLIGHT_STATUS_COLORS[status]).toBeDefined()
      expect(FLIGHT_STATUS_COLORS[status]).toMatch(/^text-/)
    }
  })
})
