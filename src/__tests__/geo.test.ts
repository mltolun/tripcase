import { describe, it, expect } from 'vitest'
import { haversineKm } from '../lib/geo'

describe('haversineKm', () => {
  it('calculates SAN->LHR distance (~8740km)', () => {
    // SAN: 32.7336, -117.1933 | LHR: 51.4700, -0.4543
    const dist = haversineKm(32.7336, -117.1933, 51.4700, -0.4543)
    expect(dist).toBeGreaterThan(8000)
    expect(dist).toBeLessThan(9500)
  })

  it('calculates JFK->LHR distance (~5540km)', () => {
    // JFK: 40.6413, -73.7781 | LHR: 51.4700, -0.4543
    const dist = haversineKm(40.6413, -73.7781, 51.4700, -0.4543)
    expect(dist).toBeGreaterThan(5000)
    expect(dist).toBeLessThan(6000)
  })

  it('returns 0 for same point', () => {
    expect(haversineKm(32.7336, -117.1933, 32.7336, -117.1933)).toBe(0)
  })

  it('calculates small distances', () => {
    const dist = haversineKm(40.6413, -73.7781, 40.6713, -73.7781)
    expect(dist).toBeGreaterThan(0)
    expect(dist).toBeLessThan(5)
  })

  it('calculates equator distance', () => {
    const dist = haversineKm(0, 0, 0, 1)
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(120)
  })

  it('result is a rounded integer', () => {
    const dist = haversineKm(32.7336, -117.1933, 51.4700, -0.4543)
    expect(Number.isInteger(dist)).toBe(true)
  })
})
