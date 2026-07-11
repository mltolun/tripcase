import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFlights } from '../hooks/useFlights'
import type { Flight, FlightInsert } from '../lib/database.types'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function createQueryBuilder() {
  const results: any[] = []
  const qb: Record<string, any> = {}
  const chain = (...methods: string[]) => {
    for (const m of methods) qb[m] = vi.fn(() => qb)
  }
  chain('select', 'eq', 'order', 'insert', 'update', 'delete')
  qb.single = vi.fn(() => qb)
  qb.then = (onfulfilled: any) => {
    const val = results.shift() ?? { data: null, error: null }
    return Promise.resolve(val).then(onfulfilled)
  }
  qb.mockResolve = (val: any) => { results.push(val) }
  mockFrom.mockReturnValue(qb)
  return qb
}

const mockFlight: Flight = {
  id: 'flight-1',
  trip_id: 'trip-1',
  user_id: 'user-1',
  airline_name: 'Iberia',
  airline_iata: 'IB',
  flight_number: 'IB3615',
  operating_airline_name: null,
  operating_airline_iata: null,
  operating_flight_number: null,
  departure_airport_code: 'MAD',
  departure_airport_name: 'Madrid Barajas',
  arrival_airport_code: 'LHR',
  arrival_airport_name: 'London Heathrow',
  departure_time: '2025-06-10T10:00:00+02:00',
  arrival_time: '2025-06-10T11:30:00+01:00',
  scheduled_departure_time: null,
  scheduled_arrival_time: null,
  duration_minutes: 90,
  departure_terminal: null,
  departure_gate: null,
  arrival_terminal: null,
  arrival_gate: null,
  arrival_baggage: null,
  flight_class: null,
  aircraft_type: null,
  booking_reference: null,
  status: 'scheduled',
  layovers: null,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('useFlights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', email: 'test@test.com' } })
  })

  describe('fetch', () => {
    it('fetches flights on mount', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockFlight], error: null })

      const { result } = renderHook(() => useFlights('trip-1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(qb.select).toHaveBeenCalledWith('*')
      expect(result.current.flights).toEqual([mockFlight])
    })

    it('does not fetch when tripId is empty', () => {
      createQueryBuilder()
      renderHook(() => useFlights(''))
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('sorts flights by departure time', async () => {
      const laterFlight = { ...mockFlight, id: 'flight-2', departure_time: '2025-07-10T10:00:00+02:00' }
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [laterFlight, mockFlight], error: null })

      const { result } = renderHook(() => useFlights('trip-1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.flights[0].id).toBe('flight-1')
      expect(result.current.flights[1].id).toBe('flight-2')
    })
  })

  describe('createFlight', () => {
    it('inserts flight and adds to state', async () => {
      const newFlight = { ...mockFlight, id: 'flight-new' }
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockFlight], error: null })
      qb.mockResolve({ data: newFlight, error: null })

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      const payload: FlightInsert = {
        trip_id: 'trip-1', user_id: 'user-1',
        airline_name: 'Iberia', departure_airport_code: 'MAD',
        arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T10:00:00+02:00',
        arrival_time: '2025-06-10T11:30:00+01:00',
      }

      await act(async () => {
        const res = await result.current.createFlight(payload)
        expect(res.error).toBeNull()
      })

      expect(qb.insert).toHaveBeenCalledWith(payload)
      expect(result.current.flights).toContainEqual(newFlight)
    })

    it('returns error when user is null', async () => {
      mockUseAuth.mockReturnValue({ user: null })
      createQueryBuilder()

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      const res = await result.current.createFlight({} as FlightInsert)
      expect(res.error).toBe('Not authenticated')
    })
  })

  describe('updateFlight', () => {
    it('updates flight in state optimistically', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockFlight], error: null })
      qb.mockResolve({ error: null })

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.updateFlight('flight-1', { airline_name: 'Updated Airline' })
        expect(res.error).toBeNull()
      })

      expect(result.current.flights[0].airline_name).toBe('Updated Airline')
    })

    it('does not update state on error', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockFlight], error: null })
      qb.mockResolve({ error: { message: 'DB error' } })

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.updateFlight('flight-1', { airline_name: 'Updated' })
        expect(res.error).toBe('DB error')
      })

      expect(result.current.flights[0].airline_name).toBe('Iberia')
    })
  })

  describe('deleteFlight', () => {
    it('removes flight from state on success', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockFlight], error: null })
      qb.mockResolve({ error: null })

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.deleteFlight('flight-1')
        expect(res.error).toBeNull()
      })

      expect(result.current.flights).toHaveLength(0)
    })

    it('does not remove flight on error', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockFlight], error: null })
      qb.mockResolve({ error: { message: 'DB error' } })

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.deleteFlight('flight-1')
        expect(res.error).toBe('DB error')
      })

      expect(result.current.flights).toHaveLength(1)
    })
  })

  describe('refetch', () => {
    it('refetches flights', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [], error: null })
      qb.mockResolve({ data: [mockFlight], error: null })

      const { result } = renderHook(() => useFlights('trip-1'))
      await waitFor(() => expect(result.current.flights).toHaveLength(0))

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.flights).toHaveLength(1)
    })
  })
})
