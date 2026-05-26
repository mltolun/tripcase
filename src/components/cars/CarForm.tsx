import { useState, type FormEvent } from 'react'
import { Input } from '../ui/Input'
import { DatePicker } from '../ui/DatePicker'
import { Button } from '../ui/Button'
import type { CarRental, CarRentalInsert } from '../../lib/database.types'

interface CarFormProps {
  initial?: Partial<CarRental>
  onSubmit: (data: CarRentalInsert) => Promise<void>
  onCancel: () => void
  tripId: string
  userId: string
}

export function CarForm({ initial, onSubmit, onCancel, tripId, userId }: CarFormProps) {
  const [loading, setLoading] = useState(false)
  const [pickupDate, setPickupDate] = useState(initial?.pickup_date ?? '')
  const [dropoffDate, setDropoffDate] = useState(initial?.dropoff_date ?? '')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const g = (k: string) => (fd.get(k) as string) || null
    await onSubmit({
      trip_id: tripId, user_id: userId,
      company_name: g('company_name') ?? '',
      car_type: g('car_type'),
      pickup_location: g('pickup_location'),
      dropoff_location: g('dropoff_location'),
      pickup_date: pickupDate,
      dropoff_date: dropoffDate,
      booking_reference: g('booking_reference'),
      total_price: null,
      currency: 'USD',
      notes: g('notes'),
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Company" name="company_name" required defaultValue={initial?.company_name} placeholder="Hertz" />
        <Input label="Car Type" name="car_type" defaultValue={initial?.car_type ?? ''} placeholder="SUV / Economy" />
      </div>
      <Input label="Pick-up Location" name="pickup_location" defaultValue={initial?.pickup_location ?? ''} placeholder="Airport Terminal 2" />
      <Input label="Drop-off Location" name="dropoff_location" defaultValue={initial?.dropoff_location ?? ''} placeholder="Hotel lobby" />
      <div className="grid grid-cols-2 gap-3">
        <DatePicker label="Pick-up Date" name="pickup_date" value={pickupDate} onChange={setPickupDate} required />
        <DatePicker label="Drop-off Date" name="dropoff_date" value={dropoffDate} onChange={setDropoffDate} required />
      </div>
      <Input label="Booking Ref" name="booking_reference" defaultValue={initial?.booking_reference ?? ''} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}>{initial?.id ? 'Save changes' : 'Add car rental'}</Button>
      </div>
    </form>
  )
}
