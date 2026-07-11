import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { FlightForm } from '../components/flights/FlightForm'
import type { Flight, FlightInsert } from '../lib/database.types'

const mockLookupFlight = vi.fn()
vi.mock('../lib/flightApi', () => ({
  lookupFlight: (...args: any[]) => mockLookupFlight(...args),
  parseFlightNumber: (input: string) => {
    const match = input.match(/^([A-Za-z]{2,3})\s*(\d+)$/)
    if (!match) return null
    return { airline: match[1].toUpperCase(), number: match[2] }
  },
}))

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>()
  return {
    ...actual,
    airlineLogoUrl: (iata: string) => `https://img.example.com/${iata}.png`,
  }
})

const defaultProps = {
  tripId: 'trip-1',
  userId: 'user-1',
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
}

function renderForm(props: Partial<typeof defaultProps> = {}) {
  return render(<FlightForm {...defaultProps} {...props} />)
}

function renderFormWithDate(props: Partial<typeof defaultProps> & { date?: string } = {}) {
  return render(
    <FlightForm
      {...defaultProps}
      {...props}
      initial={{ departure_time: '2025-06-10T10:00:00+02:00', departure_airport_code: 'MAD' }}
    />
  )
}

describe('FlightForm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    it('renders flight code input and date picker', () => {
      renderForm()
      expect(screen.getByLabelText('Flight Code')).toBeInTheDocument()
      expect(screen.getByText('Departure Date')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add flight' })).toBeInTheDocument()
    })

    it('uppercases flight code as user types', () => {
      renderForm()
      const input = screen.getByLabelText('Flight Code')
      fireEvent.change(input, { target: { value: 'ib3615' } })
      expect(input).toHaveValue('IB3615')
    })

    it('calls lookupFlight after 600ms debounce when flight code entered with date', async () => {
      mockLookupFlight.mockResolvedValue({
        airline_iata: 'IB', airline_name: 'Iberia', flight_number: 'IB3615',
        departure_airport_code: 'MAD', arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T10:00:00+02:00', arrival_time: '2025-06-10T11:30:00+01:00',
        duration_minutes: 90, status: 'scheduled',
      })

      renderFormWithDate()
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      expect(mockLookupFlight).not.toHaveBeenCalled()

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).toHaveBeenCalledWith('IB', 'IB3615', '2025-06-10')
    })

    it('does not call lookupFlight when flight code is invalid', () => {
      renderFormWithDate()
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'INVALID' } })

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).not.toHaveBeenCalled()
    })

    it('does not call lookupFlight when departure date is empty', () => {
      renderForm()
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).not.toHaveBeenCalled()
    })

    it('resets lookup result on lookup failure', async () => {
      mockLookupFlight.mockRejectedValue(new Error('Network error'))

      renderFormWithDate()
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).toHaveBeenCalled()
    })

    it('does not call lookupFlight in edit mode', () => {
      const initial: Partial<Flight> = {
        id: 'flight-1', flight_number: 'IB3615', airline_name: 'Iberia',
        departure_airport_code: 'MAD', arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T10:00:00+02:00', arrival_time: '2025-06-10T11:30:00+01:00',
      }
      renderForm({ initial })
      expect(screen.queryByLabelText('Flight Code')).not.toBeInTheDocument()
      expect(screen.queryByText('Departure Date')).not.toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).not.toHaveBeenCalled()
    })

    it('switches lookup result on flight code change', async () => {
      mockLookupFlight.mockResolvedValue({
        airline_iata: 'AA', airline_name: 'American Airlines', flight_number: 'AA100',
        departure_airport_code: 'JFK', arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T08:00:00-04:00', arrival_time: '2025-06-10T20:30:00+01:00',
        duration_minutes: 420, status: 'scheduled',
      })

      renderFormWithDate()
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).toHaveBeenCalledWith('IB', 'IB3615', '2025-06-10')

      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'AA100' } })

      act(() => { vi.advanceTimersByTime(600) })

      expect(mockLookupFlight).toHaveBeenCalledWith('AA', 'AA100', '2025-06-10')
    })
  })

  describe('edit mode', () => {
    const initial: Partial<Flight> = {
      id: 'flight-1', flight_number: 'IB3615', airline_name: 'Iberia', airline_iata: 'IB',
      departure_airport_code: 'MAD', departure_airport_name: 'Madrid Barajas',
      arrival_airport_code: 'LHR', arrival_airport_name: 'London Heathrow',
      departure_time: '2025-06-10T10:00:00+02:00', arrival_time: '2025-06-10T11:30:00+01:00',
      duration_minutes: 90, status: 'scheduled', flight_class: 'business',
      booking_reference: 'XYZ123', layovers: null,
    }

    it('renders with pre-filled values and no flight code input', () => {
      renderForm({ initial })
      expect(screen.queryByLabelText('Flight Code')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })

    it('shows lookup result display from initial data', () => {
      renderForm({ initial })
      expect(screen.getByText('Iberia')).toBeInTheDocument()
      expect(screen.getByText('IB3615')).toBeInTheDocument()
      expect(screen.getByText('MAD')).toBeInTheDocument()
      expect(screen.getByText('LHR')).toBeInTheDocument()
    })
  })

  describe('layovers', () => {
    it('adds a layover', () => {
      renderForm()
      fireEvent.click(screen.getByText('Add layover'))
      expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    })

    it('adds multiple layovers', () => {
      renderForm()
      fireEvent.click(screen.getByText('Add layover'))
      fireEvent.click(screen.getByText('Add layover'))
      expect(screen.getAllByDisplayValue('60')).toHaveLength(2)
    })

    it('removes a layover', () => {
      renderForm()
      fireEvent.click(screen.getByText('Add layover'))
      fireEvent.click(screen.getByText('Add layover'))
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(deleteButtons[0])
      expect(screen.getAllByDisplayValue('60')).toHaveLength(1)
    })

    it('updates layover airport code', () => {
      renderForm()
      fireEvent.click(screen.getByText('Add layover'))
      const codeInput = screen.getByPlaceholderText('Code (e.g. ORD)')
      fireEvent.change(codeInput, { target: { value: 'ord' } })
      expect(codeInput).toHaveValue('ORD')
    })

    it('shows initial layovers in edit mode', () => {
      const initial: Partial<Flight> = {
        id: 'flight-1', flight_number: 'IB3615', airline_name: 'Iberia',
        departure_airport_code: 'MAD', arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T10:00:00+02:00', arrival_time: '2025-06-10T11:30:00+01:00',
        layovers: [{ airport_code: 'ORD', airport_name: "Chicago O'Hare", duration_minutes: 120 }],
      }
      renderForm({ initial })
      expect(screen.getByDisplayValue('ORD')).toBeInTheDocument()
      expect(screen.getByDisplayValue('120')).toBeInTheDocument()
    })
  })

  describe('submit', () => {
    beforeEach(() => {
      vi.useRealTimers()
    })

    it('constructs correct payload and calls onSubmit', async () => {
      mockLookupFlight.mockResolvedValue({
        airline_iata: 'IB', airline_name: 'Iberia', flight_number: 'IB3615',
        departure_airport_code: 'MAD', arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T10:00:00+02:00', arrival_time: '2025-06-10T11:30:00+01:00',
        duration_minutes: 90, status: 'scheduled',
      })

      const onSubmit = vi.fn()
      renderFormWithDate({ onSubmit })
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      await waitFor(() => expect(mockLookupFlight).toHaveBeenCalled(), { timeout: 5000 })

      const form = screen.getByRole('button', { name: 'Add flight' }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce()
      })

      const payload = onSubmit.mock.calls[0][0] as FlightInsert
      expect(payload.trip_id).toBe('trip-1')
      expect(payload.user_id).toBe('user-1')
      expect(payload.flight_number).toBe('IB3615')
    })

    it('returns early if departure or arrival time is missing', async () => {
      mockLookupFlight.mockResolvedValue({
        airline_iata: 'IB', airline_name: 'Iberia', flight_number: 'IB3615',
        departure_airport_code: 'MAD', arrival_airport_code: 'LHR',
        departure_time: null, arrival_time: null,
        duration_minutes: null, status: null,
      })

      const onSubmit = vi.fn()
      renderFormWithDate({ onSubmit })
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      await waitFor(() => expect(mockLookupFlight).toHaveBeenCalled(), { timeout: 5000 })

      const form = screen.getByRole('button', { name: 'Add flight' }).closest('form')!
      fireEvent.submit(form)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits with layovers in payload', async () => {
      mockLookupFlight.mockResolvedValue({
        airline_iata: 'IB', airline_name: 'Iberia', flight_number: 'IB3615',
        departure_airport_code: 'MAD', arrival_airport_code: 'LHR',
        departure_time: '2025-06-10T10:00:00+02:00', arrival_time: '2025-06-10T11:30:00+01:00',
        duration_minutes: 90, status: 'scheduled',
      })

      const onSubmit = vi.fn()
      renderFormWithDate({ onSubmit })
      fireEvent.change(screen.getByLabelText('Flight Code'), { target: { value: 'IB3615' } })

      await waitFor(() => expect(mockLookupFlight).toHaveBeenCalled(), { timeout: 5000 })

      fireEvent.click(screen.getByText('Add layover'))
      const codeInput = screen.getByPlaceholderText('Code (e.g. ORD)')
      fireEvent.change(codeInput, { target: { value: 'ORD' } })

      const form = screen.getByRole('button', { name: 'Add flight' }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      const payload = onSubmit.mock.calls[0][0] as FlightInsert
      expect(payload.layovers).toEqual([{ airport_code: 'ORD', airport_name: '', duration_minutes: 60 }])
    })

    it('calls onCancel when cancel button clicked', () => {
      const onCancel = vi.fn()
      renderForm({ onCancel })
      fireEvent.click(screen.getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })
})
