import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Hotel, HotelInsert } from '../lib/database.types'
import { useAuth } from '../contexts/AuthContext'

export function useHotels(tripId: string) {
  const { user } = useAuth()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)

  function sortHotels(list: Hotel[]) {
    return list.sort((a, b) => {
      const ta = a.check_in_date ? new Date(a.check_in_date).getTime() || Infinity : Infinity
      const tb = b.check_in_date ? new Date(b.check_in_date).getTime() || Infinity : Infinity
      return ta - tb
    })
  }

  const fetch = useCallback(async () => {
    if (!tripId) return
    setLoading(true)
    const { data } = await supabase
      .from('hotels')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date', { ascending: true })
    setHotels(sortHotels((data ?? []) as Hotel[]))
    setLoading(false)
  }, [tripId])

  useEffect(() => { fetch() }, [fetch])

  async function createHotel(payload: HotelInsert) {
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase.from('hotels').insert(payload).select().single()
    if (!error && data) setHotels(prev => sortHotels([...prev, data as Hotel]))
    return { data, error: error?.message ?? null }
  }

  async function updateHotel(id: string, updates: Partial<HotelInsert>) {
    const { error } = await supabase.from('hotels').update(updates).eq('id', id)
    if (!error) setHotels(prev => sortHotels(prev.map(h => h.id === id ? { ...h, ...updates } : h)))
    return { error: error?.message ?? null }
  }

  async function deleteHotel(id: string) {
    const { error } = await supabase.from('hotels').delete().eq('id', id)
    if (!error) setHotels(prev => prev.filter(h => h.id !== id))
    return { error: error?.message ?? null }
  }

  return { hotels, loading, refetch: fetch, createHotel, updateHotel, deleteHotel }
}
