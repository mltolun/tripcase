import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Trip, TripInsert, TripUpdate } from '../lib/database.types'
import { useAuth } from '../contexts/AuthContext'
import { generateShareToken, fetchCityPhoto } from '../lib/utils'

export function useTrips() {
  const { user } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) { setTrips([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTrips((data ?? []) as Trip[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function createTrip(name: string, description?: string, city?: string) {
    if (!user) return { error: 'Not authenticated' }
    let cover_image_url: string | null = null
    if (city) {
      cover_image_url = await fetchCityPhoto(city)
    }
    const payload: TripInsert = {
      user_id: user.id,
      name,
      description: description ?? null,
      cover_emoji: '✈️',
      cover_image_url,
      is_public: false,
      share_token: generateShareToken(),
    }
    const { data, error } = await supabase.from('trips').insert(payload).select().single()
    if (!error && data) setTrips(prev => [data as Trip, ...prev])
    return { data, error: error?.message ?? null }
  }

  async function updateTrip(id: string, updates: TripUpdate) {
    const { error } = await supabase.from('trips').update(updates).eq('id', id)
    if (!error) setTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    return { error: error?.message ?? null }
  }

  async function deleteTrip(id: string) {
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (!error) setTrips(prev => prev.filter(t => t.id !== id))
    return { error: error?.message ?? null }
  }

  return { trips, loading, error, refetch: fetch, createTrip, updateTrip, deleteTrip }
}

export function useTripByToken(token: string) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    supabase.from('trips').select('*').eq('share_token', token).single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setTrip(data as Trip)
        setLoading(false)
      })
  }, [token])

  return { trip, loading, error }
}
