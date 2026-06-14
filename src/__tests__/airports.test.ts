import { describe, it, expect } from 'vitest'
import { getAirportCoords } from '../lib/airports'

describe('getAirportCoords', () => {
  it('returns coordinates for SAN', () => {
    const coords = getAirportCoords('SAN')
    expect(coords).toEqual({ lat: 32.7336, lng: -117.1933 })
  })

  it('returns coordinates for LHR', () => {
    const coords = getAirportCoords('LHR')
    expect(coords).toEqual({ lat: 51.4700, lng: -0.4543 })
  })

  it('returns coordinates for MAD', () => {
    const coords = getAirportCoords('MAD')
    expect(coords).toEqual({ lat: 40.4894, lng: -3.5691 })
  })

  it('returns coordinates for NRT', () => {
    const coords = getAirportCoords('NRT')
    expect(coords).toEqual({ lat: 35.7653, lng: 140.3865 })
  })

  it('returns null for unknown airport code', () => {
    expect(getAirportCoords('XYZ')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getAirportCoords('')).toBeNull()
  })

  it('is case insensitive', () => {
    const upper = getAirportCoords('SAN')
    const lower = getAirportCoords('san')
    expect(lower).toEqual(upper)
  })

  it('returns coordinates for SYD', () => {
    const coords = getAirportCoords('SYD')
    expect(coords).toEqual({ lat: -33.9399, lng: 151.1753 })
  })
})
