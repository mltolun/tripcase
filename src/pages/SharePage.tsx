import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Hotel, Car, Globe } from 'lucide-react'
import { useTripByToken } from '../hooks/useTrips'
import { useFlights } from '../hooks/useFlights'
import { useHotels } from '../hooks/useHotels'
import { useCarRentals } from '../hooks/useCarRentals'
import { FlightCard } from '../components/flights/FlightCard'
import { HotelCard } from '../components/hotels/HotelCard'
import { CarCard } from '../components/cars/CarCard'

type Tab = 'flights' | 'hotels' | 'cars'

export function SharePage() {
  const { token } = useParams<{ token: string }>()
  const { trip, loading: tripLoading, error } = useTripByToken(token ?? '')
  const { flights } = useFlights(trip?.id ?? '')
  const { hotels } = useHotels(trip?.id ?? '')
  const { cars } = useCarRentals(trip?.id ?? '')
  const [tab, setTab] = useState<Tab>('flights')

  if (tripLoading) return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-slate-600 text-sm">Loading itinerary…</p>
      </div>
    </div>
  )

  if (error || !trip) return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center gap-4">
      <span className="text-5xl">🔒</span>
      <p className="text-slate-400 font-display font-semibold">This itinerary isn't available</p>
      <p className="text-slate-600 text-sm">It may be private or the link may be invalid.</p>
      <Link to="/" className="text-amber-400 hover:text-amber-300 text-sm mt-2">Go to TripCase →</Link>
    </div>
  )

  const TABS: { key: Tab; label: string; icon: typeof Plane; count: number }[] = [
    { key: 'flights', label: 'Flights', icon: Plane, count: flights.length },
    { key: 'hotels', label: 'Hotels', icon: Hotel, count: hotels.length },
    { key: 'cars', label: 'Cars', icon: Car, count: cars.length },
  ]

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

      {/* Public header */}
      <header className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{trip.cover_emoji}</span>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-sm leading-none">{trip.name}</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Globe size={11} className="text-sky-400" />
                <span className="text-xs text-slate-600">Public itinerary</span>
              </div>
            </div>
          </div>
          <Link to="/" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
            TripCase →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">


        {/* Tabs */}
        <div className="flex items-center gap-1 bg-ink-800 p-1 rounded-xl w-fit mb-6 border border-ink-700">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-ink-700 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-mono rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                  tab === key ? 'bg-amber-400/20 text-amber-400' : 'bg-ink-700 text-slate-500'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'flights' && (
            <motion.div key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {flights.map(f => <FlightCard key={f.id} flight={f} readonly />)}
              {flights.length === 0 && <p className="text-center text-slate-600 py-12">No flights</p>}
            </motion.div>
          )}
          {tab === 'hotels' && (
            <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {hotels.map(h => <HotelCard key={h.id} hotel={h} readonly />)}
              {hotels.length === 0 && <p className="text-center text-slate-600 py-12">No hotels</p>}
            </motion.div>
          )}
          {tab === 'cars' && (
            <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {cars.map(c => <CarCard key={c.id} car={c} readonly />)}
              {cars.length === 0 && <p className="text-center text-slate-600 py-12">No car rentals</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
