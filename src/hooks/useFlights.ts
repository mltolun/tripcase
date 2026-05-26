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
    const sorted = ((data ?? []) as Flight[]).sort((a, b) => 
      new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
    )
    setFlights(sorted)
    setLoading(false)
  }, [tripId])

  useEffect(() => { fetch() }, [fetch])

  function sortFlights(list: Flight[]) {
    return list.sort((a, b) => {
      const ta = a.departure_time ? new Date(a.departure_time).getTime() || Infinity : Infinity
      const tb = b.departure_time ? new Date(b.departure_time).getTime() || Infinity : Infinity
      return ta - tb
    })
  }

  async function createFlight(payload: FlightInsert) {
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase.from('flights').insert(payload).select().single()
    if (!error && data) {
      const f = data as Flight
      setFlights(prev => sortFlights([...prev, f]))
    }
    return { data, error: error?.message ?? null }
  }

  async function updateFlight(id: string, updates: Partial<FlightInsert>) {
    const { error } = await supabase.from('flights').update(updates).eq('id', id)
    if (!error) setFlights(prev => sortFlights(prev.map(f => f.id === id ? { ...f, ...updates } : f)))
    return { error: error?.message ?? null }
  }

  async function deleteFlight(id: string) {
    const { error } = await supabase.from('flights').delete().eq('id', id)
    if (!error) setFlights(prev => prev.filter(f => f.id !== id))
    return { error: error?.message ?? null }
  }

  return { flights, loading, refetch: fetch, createFlight, updateFlight, deleteFlight }
}
