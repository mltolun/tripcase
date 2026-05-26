import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CarRental, CarRentalInsert } from '../lib/database.types'
import { useAuth } from '../contexts/AuthContext'

export function useCarRentals(tripId: string) {
  const { user } = useAuth()
  const [cars, setCars] = useState<CarRental[]>([])
  const [loading, setLoading] = useState(true)

  function sortCars(list: CarRental[]) {
    return list.sort((a, b) => new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime())
  }

  const fetch = useCallback(async () => {
    if (!tripId) return
    setLoading(true)
    const { data } = await supabase
      .from('car_rentals')
      .select('*')
      .eq('trip_id', tripId)
      .order('pickup_date', { ascending: true })
    setCars(sortCars((data ?? []) as CarRental[]))
    setLoading(false)
  }, [tripId])

  useEffect(() => { fetch() }, [fetch])

  async function createCar(payload: CarRentalInsert) {
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase.from('car_rentals').insert(payload).select().single()
    if (!error && data) setCars(prev => sortCars([...prev, data as CarRental]))
    return { data, error: error?.message ?? null }
  }

  async function updateCar(id: string, updates: Partial<CarRentalInsert>) {
    const { error } = await supabase.from('car_rentals').update(updates).eq('id', id)
    if (!error) setCars(prev => sortCars(prev.map(c => c.id === id ? { ...c, ...updates } : c)))
    return { error: error?.message ?? null }
  }

  async function deleteCar(id: string) {
    const { error } = await supabase.from('car_rentals').delete().eq('id', id)
    if (!error) setCars(prev => prev.filter(c => c.id !== id))
    return { error: error?.message ?? null }
  }

  return { cars, loading, refetch: fetch, createCar, updateCar, deleteCar }
}
