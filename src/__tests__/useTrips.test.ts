import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTrips, useTripByToken } from '../hooks/useTrips'
import type { Trip } from '../lib/database.types'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockFetchCityPhoto = vi.fn()
const mockGenerateShareToken = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>()
  return {
    ...actual,
    generateShareToken: (...args: any[]) => mockGenerateShareToken(...args),
    fetchCityPhoto: (...args: any[]) => mockFetchCityPhoto(...args),
  }
})

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

const mockTrip: Trip = {
  id: 'trip-1', user_id: 'user-1', name: 'Summer Vacation',
  description: 'A trip to Spain', cover_emoji: '\u2708\ufe0f',
  cover_image_url: null, start_date: null, end_date: null,
  is_public: false, share_token: 'abc123',
  created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
}

describe('useTrips', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', email: 'test@test.com' } })
    mockFetchCityPhoto.mockResolvedValue('https://example.com/photo.jpg')
    mockGenerateShareToken.mockReturnValue('mock-share-token')
  })

  describe('fetch', () => {
    it('fetches trips on mount', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockTrip], error: null })

      const { result } = renderHook(() => useTrips())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.trips).toEqual([mockTrip])
      expect(result.current.error).toBeNull()
    })

    it('sets error on fetch failure', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: null, error: { message: 'Failed to fetch' } })

      const { result } = renderHook(() => useTrips())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.error).toBe('Failed to fetch')
    })

    it('clears trips when user is null', async () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useTrips())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.trips).toEqual([])
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('createTrip', () => {
    it('creates a trip and adds to state', async () => {
      const newTrip = { ...mockTrip, id: 'trip-new' }
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockTrip], error: null })
      qb.mockResolve({ data: newTrip, error: null })

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.createTrip('New Trip')
        expect(res.error).toBeNull()
      })

      expect(result.current.trips).toContainEqual(newTrip)
    })

    it('returns error when user is null', async () => {
      mockUseAuth.mockReturnValue({ user: null })
      createQueryBuilder()

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.loading).toBe(false))

      const res = await result.current.createTrip('New Trip')
      expect(res.error).toBe('Not authenticated')
    })

    it('creates trip with city cover photo', async () => {
      const newTrip = { ...mockTrip, id: 'trip-city', cover_image_url: 'https://example.com/photo.jpg' }
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [], error: null })
      qb.mockResolve({ data: newTrip, error: null })

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.createTrip('Barcelona Trip', undefined, 'Barcelona')
      })

      expect(mockFetchCityPhoto).toHaveBeenCalledWith('Barcelona')
    })
  })

  describe('updateTrip', () => {
    it('updates trip in state optimistically', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockTrip], error: null })
      qb.mockResolve({ error: null })

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.updateTrip('trip-1', { name: 'Updated Name' })
        expect(res.error).toBeNull()
      })

      expect(result.current.trips[0].name).toBe('Updated Name')
    })

    it('does not update state on error', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockTrip], error: null })
      qb.mockResolve({ error: { message: 'DB error' } })

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.updateTrip('trip-1', { name: 'Updated Name' })
        expect(res.error).toBe('DB error')
      })

      expect(result.current.trips[0].name).toBe('Summer Vacation')
    })
  })

  describe('deleteTrip', () => {
    it('removes trip from state on success', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [mockTrip], error: null })
      qb.mockResolve({ error: null })

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const res = await result.current.deleteTrip('trip-1')
        expect(res.error).toBeNull()
      })

      expect(result.current.trips).toHaveLength(0)
    })
  })

  describe('refetch', () => {
    it('refetches trips', async () => {
      const qb = createQueryBuilder()
      qb.mockResolve({ data: [], error: null })
      qb.mockResolve({ data: [mockTrip], error: null })

      const { result } = renderHook(() => useTrips())
      await waitFor(() => expect(result.current.trips).toHaveLength(0))

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.trips).toHaveLength(1)
    })
  })
})

describe('useTripByToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches trip by share token', async () => {
    const qb = createQueryBuilder()
    qb.mockResolve({ data: mockTrip, error: null })

    const { result } = renderHook(() => useTripByToken('abc123'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.trip).toEqual(mockTrip)
  })

  it('sets error on failure', async () => {
    const qb = createQueryBuilder()
    qb.mockResolve({ data: null, error: { message: 'Not found' } })

    const { result } = renderHook(() => useTripByToken('bad-token'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.trip).toBeNull()
    expect(result.current.error).toBe('Not found')
  })

  it('does not fetch when token is empty', () => {
    renderHook(() => useTripByToken(''))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
