import { useState, type FormEvent } from 'react'
import { Input } from '../ui/Input'
import { DatePicker } from '../ui/DatePicker'
import { Button } from '../ui/Button'
import type { Hotel, HotelInsert } from '../../lib/database.types'

interface HotelFormProps {
  initial?: Partial<Hotel>
  onSubmit: (data: HotelInsert) => Promise<void>
  onCancel: () => void
  tripId: string
  userId: string
}

export function HotelForm({ initial, onSubmit, onCancel, tripId, userId }: HotelFormProps) {
  const [loading, setLoading] = useState(false)
  const [checkIn, setCheckIn] = useState(initial?.check_in_date ?? '')
  const [checkOut, setCheckOut] = useState(initial?.check_out_date ?? '')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const g = (k: string) => (fd.get(k) as string) || null
    await onSubmit({
      trip_id: tripId, user_id: userId,
      hotel_name: g('hotel_name') ?? '',
      address: g('address'), city: g('city'), country: g('country'),
      check_in_date: checkIn,
      check_out_date: checkOut,
      room_type: g('room_type'),
      booking_reference: g('booking_reference'),
      confirmation_number: g('confirmation_number'),
      price_per_night: null,
      total_price: null,
      currency: 'USD',
      notes: g('notes'),
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Hotel Name" name="hotel_name" required defaultValue={initial?.hotel_name} placeholder="Hotel Arts Barcelona" />
      <Input label="Address" name="address" defaultValue={initial?.address ?? ''} placeholder="Carrer de la Marina, 19-21" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" name="city" defaultValue={initial?.city ?? ''} placeholder="Barcelona" />
        <Input label="Country" name="country" defaultValue={initial?.country ?? ''} placeholder="Spain" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DatePicker label="Check-in Date" name="check_in_date" value={checkIn} onChange={setCheckIn} required />
        <DatePicker label="Check-out Date" name="check_out_date" value={checkOut} onChange={setCheckOut} required />
      </div>
      <Input label="Room Type" name="room_type" defaultValue={initial?.room_type ?? ''} placeholder="Deluxe King Room" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Booking Reference" name="booking_reference" defaultValue={initial?.booking_reference ?? ''} placeholder="HRS-123456" />
        <Input label="Confirmation #" name="confirmation_number" defaultValue={initial?.confirmation_number ?? ''} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}>{initial?.id ? 'Save changes' : 'Add hotel'}</Button>
      </div>
    </form>
  )
}
