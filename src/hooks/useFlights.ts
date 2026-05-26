import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Flight, FlightInsert } from '../lib/database.types'
import { useAuth } from '../contexts/AuthContext'

export function useFlights(tripId: string) {
  const { user } = useAuth()
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tripId) return
    setLoading(true)
    const { data } = await supabase
      .from('flights')
      .select('*')
      .eq('trip_id', tripId)
      .order('departure_time', { ascending: true })
    setFlights((data ?? []) as Flight[])
    setLoading(false)
  }, [tripId])

  useEffect(() => { fetch() }, [fetch])

  async function createFlight(payload: FlightInsert) {
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase.from('flights').insert(payload).select().single()
    if (!error && data) {
      const f = data as Flight
      setFlights(prev => [...prev, f].sort((a, b) => a.departure_time.localeCompare(b.departure_time)))
    }
    return { data, error: error?.message ?? null }
  }

  async function updateFlight(id: string, updates: Partial<FlightInsert>) {
    const { error } = await supabase.from('flights').update(updates).eq('id', id)
    if (!error) setFlights(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f).sort((a, b) => a.departure_time.localeCompare(b.departure_time)))
    return { error: error?.message ?? null }
  }

  async function deleteFlight(id: string) {
    const { error } = await supabase.from('flights').delete().eq('id', id)
    if (!error) setFlights(prev => prev.filter(f => f.id !== id))
    return { error: error?.message ?? null }
  }

  return { flights, loading, refetch: fetch, createFlight, updateFlight, deleteFlight }
}
