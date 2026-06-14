import { describe, it, expect } from 'vitest'
import { searchAirlines, airlineLogoUrl } from '../lib/airlines'

describe('searchAirlines', () => {
  it('returns results searching by name', () => {
    const results = searchAirlines('American')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toContain('American')
  })

  it('returns results searching by IATA code', () => {
    const results = searchAirlines('AA')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].iata).toBe('AA')
  })

  it('returns results searching by country', () => {
    const results = searchAirlines('US')
    expect(results.length).toBeGreaterThan(0)
    const allUS = results.every(a => a.country === 'US')
    expect(allUS).toBe(true)
  })

  it('returns empty array for empty query', () => {
    expect(searchAirlines('')).toHaveLength(0)
  })

  it('is case insensitive', () => {
    const lower = searchAirlines('american')
    const upper = searchAirlines('AMERICAN')
    expect(lower).toEqual(upper)
  })

  it('returns at most 8 results', () => {
    const results = searchAirlines('a')
    expect(results.length).toBeLessThanOrEqual(8)
  })

  it('finds partial matches', () => {
    const results = searchAirlines('elta')
    expect(results.some(a => a.name.includes('Delta'))).toBe(true)
  })

  it('finds British Airways by various queries', () => {
    expect(searchAirlines('British').some(a => a.iata === 'BA')).toBe(true)
    expect(searchAirlines('BA').some(a => a.iata === 'BA')).toBe(true)
    expect(searchAirlines('GB').some(a => a.iata === 'BA')).toBe(true)
  })
})

describe('airlineLogoUrl', () => {
  it('returns correct URL for American Airlines', () => {
    expect(airlineLogoUrl('AA')).toBe('https://images.kiwi.com/airlines/64/AA.png')
  })

  it('returns correct URL for British Airways', () => {
    expect(airlineLogoUrl('BA')).toBe('https://images.kiwi.com/airlines/64/BA.png')
  })

  it('uppercases the IATA code', () => {
    expect(airlineLogoUrl('ib')).toBe('https://images.kiwi.com/airlines/64/IB.png')
  })
})
