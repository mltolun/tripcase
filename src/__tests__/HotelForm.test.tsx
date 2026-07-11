import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HotelForm } from '../components/hotels/HotelForm'
import type { Hotel, HotelInsert } from '../lib/database.types'

const defaultProps = {
  tripId: 'trip-1',
  userId: 'user-1',
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
}

function renderForm(props: Partial<typeof defaultProps & { initial?: Partial<Hotel> }> = {}) {
  return render(<HotelForm {...defaultProps} {...props} />)
}

describe('HotelForm', () => {
  describe('create mode', () => {
    it('renders all form fields', () => {
      renderForm()
      expect(screen.getByLabelText('Hotel Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Address')).toBeInTheDocument()
      expect(screen.getByLabelText('City')).toBeInTheDocument()
      expect(screen.getByLabelText('Country')).toBeInTheDocument()
      expect(screen.getByText('Check-in Date')).toBeInTheDocument()
      expect(screen.getByText('Check-out Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Room Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Booking Reference')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirmation #')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add hotel' })).toBeInTheDocument()
    })

    it('submits with correct payload', async () => {
      const onSubmit = vi.fn()
      renderForm({ onSubmit })

      fireEvent.change(screen.getByLabelText('Hotel Name'), { target: { value: 'Hotel Arts' } })
      fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Barcelona' } })
      fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'Spain' } })

      const form = screen.getByRole('button', { name: 'Add hotel' }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce()
      })

      const payload = onSubmit.mock.calls[0][0] as HotelInsert
      expect(payload.trip_id).toBe('trip-1')
      expect(payload.user_id).toBe('user-1')
      expect(payload.hotel_name).toBe('Hotel Arts')
      expect(payload.city).toBe('Barcelona')
      expect(payload.country).toBe('Spain')
      expect(payload.currency).toBe('USD')
    })

    it('calls onCancel when cancel button clicked', () => {
      const onCancel = vi.fn()
      renderForm({ onCancel })
      fireEvent.click(screen.getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe('edit mode', () => {
    const initial: Partial<Hotel> = {
      id: 'hotel-1',
      hotel_name: 'Hotel Arts',
      address: 'Carrer de la Marina, 19-21',
      city: 'Barcelona',
      country: 'Spain',
      check_in_date: '2025-06-10',
      check_out_date: '2025-06-15',
      room_type: 'Deluxe King',
      booking_reference: 'HRS-123',
      confirmation_number: 'CNF-456',
    }

    it('pre-fills form fields from initial data', () => {
      renderForm({ initial })
      expect(screen.getByLabelText('Hotel Name')).toHaveValue('Hotel Arts')
      expect(screen.getByLabelText('Address')).toHaveValue('Carrer de la Marina, 19-21')
      expect(screen.getByLabelText('Room Type')).toHaveValue('Deluxe King')
    })

    it('shows save changes button', () => {
      renderForm({ initial })
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })
  })
})
