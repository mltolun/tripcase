import { describe, it, expect } from 'vitest'
import { parseFlightNumber } from '../lib/flightApi'

describe('parseFlightNumber', () => {
  it('parses "IB3615" correctly', () => {
    expect(parseFlightNumber('IB3615')).toEqual({ airline: 'IB', number: '3615' })
  })

  it('parses "AA100" correctly', () => {
    expect(parseFlightNumber('AA100')).toEqual({ airline: 'AA', number: '100' })
  })

  it('supports 3-letter airline code "TOM123"', () => {
    expect(parseFlightNumber('TOM123')).toEqual({ airline: 'TOM', number: '123' })
  })

  it('parses "BA1" (single digit)', () => {
    expect(parseFlightNumber('BA1')).toEqual({ airline: 'BA', number: '1' })
  })

  it('returns null for missing digits', () => {
    expect(parseFlightNumber('XXX')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseFlightNumber('')).toBeNull()
  })

  it('returns null for digits only', () => {
    expect(parseFlightNumber('12345')).toBeNull()
  })

  it('returns null for whitespace-padded input (function does not trim)', () => {
    expect(parseFlightNumber('  IB3615  ')).toBeNull()
  })

  it('uppercases airline code', () => {
    expect(parseFlightNumber('ib3615')).toEqual({ airline: 'IB', number: '3615' })
  })
})
