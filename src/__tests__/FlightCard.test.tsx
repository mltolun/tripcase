import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlightCard } from '../components/flights/FlightCard'
import type { Flight } from '../lib/database.types'

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>()
  return {
    ...actual,
    airlineLogoUrl: (iata: string) => `https://img.example.com/${iata}.png`,
  }
})

const baseFlight: Flight = {
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
  scheduled_departure_time: '2025-06-10T10:00:00+02:00',
  scheduled_arrival_time: '2025-06-10T11:30:00+01:00',
  duration_minutes: 90,
  departure_terminal: '4',
  departure_gate: 'B12',
  arrival_terminal: '5',
  arrival_gate: 'C7',
  arrival_baggage: '5',
  flight_class: 'business',
  aircraft_type: 'A330',
  booking_reference: 'XYZ123',
  status: 'scheduled',
  layovers: null,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

function renderCard(overrides: Partial<Flight> = {}, props: Partial<{ onEdit: any; onDelete: any; readonly: boolean }> = {}) {
  const flight = { ...baseFlight, ...overrides }
  return render(
    <FlightCard
      flight={flight}
      onEdit={props.onEdit ?? vi.fn()}
      onDelete={props.onDelete ?? vi.fn()}
      readonly={props.readonly ?? false}
    />
  )
}

describe('FlightCard', () => {
  describe('airline and flight info', () => {
    it('renders airline name', () => {
      renderCard()
      expect(screen.getByText('Iberia')).toBeInTheDocument()
    })

    it('renders flight number', () => {
      renderCard()
      expect(screen.getByText('IB3615 · A330')).toBeInTheDocument()
    })

    it('renders flight number without aircraft type when not available', () => {
      renderCard({ aircraft_type: null })
      expect(screen.getByText('IB3615')).toBeInTheDocument()
    })

    it('renders fallback when flight number is null', () => {
      renderCard({ flight_number: null })
      expect(screen.getByText(/–/)).toBeInTheDocument()
    })

    it('renders airline logo image', () => {
      renderCard()
      const img = screen.getByAltText('Iberia')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://img.example.com/IB.png')
    })

    it('shows fallback when no airline IATA', () => {
      renderCard({ airline_iata: null })
      expect(screen.getByText('IB')).toBeInTheDocument()
    })

    it('shows operating airline when different from marketing airline', () => {
      renderCard({
        operating_airline_name: 'BA CityFlyer',
        operating_airline_iata: 'BA',
        operating_flight_number: 'BA1234',
      })
      expect(screen.getByText(/Operated by BA CityFlyer/)).toBeInTheDocument()
    })

    it('does not show operating airline when same as marketing', () => {
      renderCard({ operating_airline_name: 'Iberia' })
      expect(screen.queryByText(/Operated by/)).not.toBeInTheDocument()
    })
  })

  describe('status badge', () => {
    it('renders status badge', () => {
      renderCard()
      expect(screen.getByText('scheduled')).toBeInTheDocument()
    })

    it.each(['active', 'delayed', 'cancelled', 'landed', 'unknown'])(
      'renders %s status badge',
      (status) => {
        renderCard({ status } as Partial<Flight>)
        expect(screen.getByText(status)).toBeInTheDocument()
      }
    )
  })

  describe('airports and times', () => {
    it('renders departure airport code', () => {
      renderCard()
      expect(screen.getByText('MAD')).toBeInTheDocument()
    })

    it('renders arrival airport code', () => {
      renderCard()
      expect(screen.getByText('LHR')).toBeInTheDocument()
    })

    it('renders departure time', () => {
      renderCard()
      expect(screen.getByText('10:00')).toBeInTheDocument()
    })

    it('renders arrival time', () => {
      renderCard()
      expect(screen.getByText('11:30')).toBeInTheDocument()
    })

    it('renders airport names', () => {
      renderCard()
      expect(screen.getByText('Madrid Barajas')).toBeInTheDocument()
      expect(screen.getByText('London Heathrow')).toBeInTheDocument()
    })

    it('falls back to airport code when name is null', () => {
      renderCard({ departure_airport_name: null, arrival_airport_name: null })
      expect(screen.getAllByText('MAD').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('LHR').length).toBeGreaterThanOrEqual(1)
    })

    it('renders terminal and gate info for departure', () => {
      renderCard()
      expect(screen.getByText('T4 · Gate B12')).toBeInTheDocument()
    })

    it('renders terminal and gate info for arrival', () => {
      renderCard()
      expect(screen.getByText('T5 · Gate C7')).toBeInTheDocument()
    })
  })

  describe('time comparison (early/delayed/on-time)', () => {
    it('shows on-time indicator when actual matches scheduled', () => {
      renderCard()
      expect(screen.queryByText(/Actual:/)).not.toBeInTheDocument()
    })

    it('shows delayed label when flight is delayed', () => {
      const later = new Date(new Date(baseFlight.scheduled_departure_time!).getTime() + 30 * 60 * 1000).toISOString()
      renderCard({ departure_time: later })
      expect(screen.getByText(/Actual:/)).toBeInTheDocument()
    })

    it('shows early label when flight is early', () => {
      const earlier = new Date(new Date(baseFlight.scheduled_departure_time!).getTime() - 30 * 60 * 1000).toISOString()
      renderCard({ departure_time: earlier })
      expect(screen.getByText(/Actual:/)).toBeInTheDocument()
    })

    it('does not show comparison when scheduled time is null', () => {
      renderCard({ scheduled_departure_time: null })
      expect(screen.queryByText(/Actual:/)).not.toBeInTheDocument()
    })
  })

  describe('duration', () => {
    it('renders duration', () => {
      renderCard()
      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })

    it('renders -- when duration is null', () => {
      renderCard({ duration_minutes: null })
      expect(screen.getByText('--')).toBeInTheDocument()
    })
  })

  describe('layovers', () => {
    it('shows nonstop when no layovers', () => {
      renderCard()
      expect(screen.getByText('nonstop')).toBeInTheDocument()
    })

    it('shows layover count when layovers exist', () => {
      renderCard({
        layovers: [
          { airport_code: 'ORD', airport_name: "Chicago O'Hare", duration_minutes: 120 },
        ],
      })
      expect(screen.getByText('1 stop')).toBeInTheDocument()
      expect(screen.getByText(/2h 0m layover/)).toBeInTheDocument()
    })

    it('shows multiple stop count', () => {
      renderCard({
        layovers: [
          { airport_code: 'ORD', airport_name: "Chicago O'Hare", duration_minutes: 120 },
          { airport_code: 'DFW', airport_name: 'Dallas', duration_minutes: 60 },
        ],
      })
      expect(screen.getByText('2 stops')).toBeInTheDocument()
    })
  })

  describe('footer info', () => {
    it('renders baggage info when available', () => {
      renderCard()
      expect(screen.getByText(/Baggage:/)).toBeInTheDocument()
    })

    it('renders booking reference when available', () => {
      renderCard({ booking_reference: 'XYZ123' })
      expect(screen.getByText(/Ref:/)).toBeInTheDocument()
    })

    it('renders flight class', () => {
      renderCard()
      expect(screen.getByText('business')).toBeInTheDocument()
    })
  })

  describe('edit and delete actions', () => {
    it('shows edit button when onEdit provided', () => {
      renderCard()
      expect(screen.getByTestId('icon-pencil')).toBeInTheDocument()
    })

    it('shows delete button when onDelete provided', () => {
      renderCard()
      expect(screen.getByTestId('icon-trash')).toBeInTheDocument()
    })

    it('hides action buttons in readonly mode', () => {
      renderCard({}, { readonly: true })
      expect(screen.queryByTestId('icon-pencil')).not.toBeInTheDocument()
      expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument()
    })

    it('calls onEdit when edit button clicked', () => {
      const onEdit = vi.fn()
      renderCard({}, { onEdit })
      fireEvent.click(screen.getByTestId('icon-pencil').closest('button')!)
      expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'flight-1' }))
    })
  })

  describe('delete confirmation modal', () => {
    it('opens delete confirmation modal on delete click', () => {
      renderCard()
      fireEvent.click(screen.getByTestId('icon-trash').closest('button')!)
      expect(screen.getByText('Delete flight?')).toBeInTheDocument()
    })

    it('calls onDelete when confirmed', () => {
      const onDelete = vi.fn()
      renderCard({}, { onDelete })
      fireEvent.click(screen.getByTestId('icon-trash').closest('button')!)
      fireEvent.click(screen.getByText('Delete'))
      expect(onDelete).toHaveBeenCalledWith('flight-1')
    })

    it('closes modal on cancel', () => {
      renderCard()
      fireEvent.click(screen.getByTestId('icon-trash').closest('button')!)
      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.queryByText('Delete flight?')).not.toBeInTheDocument()
    })
  })
})
