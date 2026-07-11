import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CarForm } from '../components/cars/CarForm'
import type { CarRental, CarRentalInsert } from '../lib/database.types'

const defaultProps = {
  tripId: 'trip-1',
  userId: 'user-1',
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
}

function renderForm(props: Partial<typeof defaultProps & { initial?: Partial<CarRental> }> = {}) {
  return render(<CarForm {...defaultProps} {...props} />)
}

describe('CarForm', () => {
  describe('create mode', () => {
    it('renders all form fields', () => {
      renderForm()
      expect(screen.getByLabelText('Company')).toBeInTheDocument()
      expect(screen.getByLabelText('Car Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Pick-up Location')).toBeInTheDocument()
      expect(screen.getByLabelText('Drop-off Location')).toBeInTheDocument()
      expect(screen.getByText('Pick-up Date')).toBeInTheDocument()
      expect(screen.getByText('Drop-off Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Booking Ref')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add car rental' })).toBeInTheDocument()
    })

    it('submits with correct payload', async () => {
      const onSubmit = vi.fn()
      renderForm({ onSubmit })

      fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Hertz' } })
      fireEvent.change(screen.getByLabelText('Car Type'), { target: { value: 'SUV' } })
      fireEvent.change(screen.getByLabelText('Pick-up Location'), { target: { value: 'Airport Terminal 1' } })

      const form = screen.getByRole('button', { name: 'Add car rental' }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce()
      })

      const payload = onSubmit.mock.calls[0][0] as CarRentalInsert
      expect(payload.trip_id).toBe('trip-1')
      expect(payload.user_id).toBe('user-1')
      expect(payload.company_name).toBe('Hertz')
      expect(payload.car_type).toBe('SUV')
      expect(payload.pickup_location).toBe('Airport Terminal 1')
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
    const initial: Partial<CarRental> = {
      id: 'car-1',
      company_name: 'Hertz',
      car_type: 'SUV',
      pickup_location: 'Airport Terminal 1',
      dropoff_location: 'Hotel downtown',
      pickup_date: '2025-06-10',
      dropoff_date: '2025-06-15',
      booking_reference: 'CAR-789',
    }

    it('pre-fills form fields from initial data', () => {
      renderForm({ initial })
      expect(screen.getByLabelText('Company')).toHaveValue('Hertz')
      expect(screen.getByLabelText('Car Type')).toHaveValue('SUV')
      expect(screen.getByLabelText('Pick-up Location')).toHaveValue('Airport Terminal 1')
    })

    it('shows save changes button', () => {
      renderForm({ initial })
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })
  })
})
