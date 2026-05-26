import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Plane, Hotel, Car, Globe, Copy } from 'lucide-react'
import { useTrips } from '../hooks/useTrips'
import { useFlights } from '../hooks/useFlights'
import { useHotels } from '../hooks/useHotels'
import { useCarRentals } from '../hooks/useCarRentals'
import { useAuth } from '../contexts/AuthContext'
import { FlightCard } from '../components/flights/FlightCard'
import { FlightForm } from '../components/flights/FlightForm'
import { HotelCard } from '../components/hotels/HotelCard'
import { HotelForm } from '../components/hotels/HotelForm'
import { CarCard } from '../components/cars/CarCard'
import { CarForm } from '../components/cars/CarForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import type { Flight, Hotel as HotelType, CarRental, FlightInsert, HotelInsert, CarRentalInsert } from '../lib/database.types'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

type Tab = 'flights' | 'hotels' | 'cars'

export function TripPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { trips, updateTrip } = useTrips()
  const trip = trips.find(t => t.id === id)

  const { flights, loading: flightsLoading, createFlight, updateFlight, deleteFlight } = useFlights(id ?? '')
  const { hotels, loading: hotelsLoading, createHotel, updateHotel, deleteHotel } = useHotels(id ?? '')
  const { cars, loading: carsLoading, createCar, updateCar, deleteCar } = useCarRentals(id ?? '')

  const [tab, setTab] = useState<Tab>('flights')
  const [flightModal, setFlightModal] = useState<{ open: boolean; editing?: Flight }>({ open: false })
  const [hotelModal, setHotelModal] = useState<{ open: boolean; editing?: HotelType }>({ open: false })
  const [carModal, setCarModal] = useState<{ open: boolean; editing?: CarRental }>({ open: false })

  if (!id) return null
  if (!trip || !user) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-slate-500">Trip not found.</p>
      <Button variant="ghost" onClick={() => navigate('/')} className="mt-4"><ArrowLeft size={14} /> Back</Button>
    </div>
  )

  async function handleRefreshFlight(flightId: string) {
    const flight = flights.find(f => f.id === flightId)
    if (!flight?.flight_number) { toast.error('No flight number set'); return }
    const { data, error } = await supabase.functions.invoke('check-flight-status', {
      body: { flight_id: flightId, flight_number: flight.flight_number, departure_date: flight.departure_time.slice(0, 10) }
    })
    if (error) toast.error('Status refresh failed')
    else { await updateFlight(flightId, { status: data.status }); toast.success(`Status: ${data.status}`) }
  }

  function copyShareLink() {
    if (!trip) return
    navigator.clipboard.writeText(`${window.location.origin}/share/${trip.share_token}`)
    toast.success('Share link copied!')
  }

  const TABS: { key: Tab; label: string; icon: typeof Plane; count: number }[] = [
    { key: 'flights', label: 'Flights', icon: Plane, count: flights.length },
    { key: 'hotels', label: 'Hotels', icon: Hotel, count: hotels.length },
    { key: 'cars', label: 'Car Rentals', icon: Car, count: cars.length },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-500 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-ink-800">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{trip.cover_emoji}</span>
              <h1 className="font-display font-bold text-2xl text-slate-900">{trip.name}</h1>
            </div>
            {trip.description && <p className="text-sm text-slate-600 mt-0.5">{trip.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trip.is_public && (
            <Button variant="secondary" size="sm" onClick={copyShareLink}>
              <Copy size={13} /> Share
            </Button>
          )}
          <Button
            variant="ghost" size="sm"
            onClick={() => updateTrip(trip.id, { is_public: !trip.is_public }).then(() =>
              toast.success(trip.is_public ? 'Set to private' : 'Now public'))}
          >
            <Globe size={13} className={trip.is_public ? 'text-sky-400' : ''} />
            {trip.is_public ? 'Public' : 'Private'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-ink-800 p-1 rounded-xl w-fit mb-6 border border-ink-700">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'flights' && (
          <motion.div key="flights" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="flex justify-end mb-4">
              <Button variant="primary" size="sm" onClick={() => setFlightModal({ open: true })}>
                <Plus size={14} /> Add flight
              </Button>
            </div>
            {flightsLoading ? <LoadingSkeleton /> : (
              <div className="space-y-3">
                <AnimatePresence>
                  {flights.map(f => (
                    <FlightCard
                      key={f.id} flight={f}
                      onEdit={f => setFlightModal({ open: true, editing: f })}
                      onDelete={async id => { await deleteFlight(id); toast.success('Flight removed') }}
                      onRefreshStatus={handleRefreshFlight}
                    />
                  ))}
                </AnimatePresence>
                {flights.length === 0 && <EmptyState icon={<Plane size={28} />} label="No flights yet" />}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'hotels' && (
          <motion.div key="hotels" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="flex justify-end mb-4">
              <Button variant="primary" size="sm" onClick={() => setHotelModal({ open: true })}>
                <Plus size={14} /> Add hotel
              </Button>
            </div>
            {hotelsLoading ? <LoadingSkeleton /> : (
              <div className="space-y-3">
                <AnimatePresence>
                  {hotels.map(h => (
                    <HotelCard
                      key={h.id} hotel={h}
                      onEdit={h => setHotelModal({ open: true, editing: h })}
                      onDelete={async id => { await deleteHotel(id); toast.success('Hotel removed') }}
                    />
                  ))}
                </AnimatePresence>
                {hotels.length === 0 && <EmptyState icon={<Hotel size={28} />} label="No hotels yet" />}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'cars' && (
          <motion.div key="cars" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="flex justify-end mb-4">
              <Button variant="primary" size="sm" onClick={() => setCarModal({ open: true })}>
                <Plus size={14} /> Add car rental
              </Button>
            </div>
            {carsLoading ? <LoadingSkeleton /> : (
              <div className="space-y-3">
                <AnimatePresence>
                  {cars.map(c => (
                    <CarCard
                      key={c.id} car={c}
                      onEdit={c => setCarModal({ open: true, editing: c })}
                      onDelete={async id => { await deleteCar(id); toast.success('Car rental removed') }}
                    />
                  ))}
                </AnimatePresence>
                {cars.length === 0 && <EmptyState icon={<Car size={28} />} label="No car rentals yet" />}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modal open={flightModal.open} onClose={() => setFlightModal({ open: false })}
        title={flightModal.editing ? 'Edit flight' : 'Add flight'} size="lg">
        <FlightForm
          initial={flightModal.editing}
          tripId={id}
          userId={user!.id}
          onCancel={() => setFlightModal({ open: false })}
          onSubmit={async (data: FlightInsert) => {
            if (flightModal.editing) await updateFlight(flightModal.editing.id, data)
            else await createFlight(data)
            setFlightModal({ open: false })
            toast.success(flightModal.editing ? 'Flight updated' : 'Flight added')
          }}
        />
      </Modal>

      <Modal open={hotelModal.open} onClose={() => setHotelModal({ open: false })}
        title={hotelModal.editing ? 'Edit hotel' : 'Add hotel'} size="lg">
        <HotelForm
          initial={hotelModal.editing}
          tripId={id}
          userId={user!.id}
          onCancel={() => setHotelModal({ open: false })}
          onSubmit={async (data: HotelInsert) => {
            if (hotelModal.editing) await updateHotel(hotelModal.editing.id, data)
            else await createHotel(data)
            setHotelModal({ open: false })
            toast.success(hotelModal.editing ? 'Hotel updated' : 'Hotel added')
          }}
        />
      </Modal>

      <Modal open={carModal.open} onClose={() => setCarModal({ open: false })}
        title={carModal.editing ? 'Edit car rental' : 'Add car rental'}>
        <CarForm
          initial={carModal.editing}
          tripId={id}
          userId={user!.id}
          onCancel={() => setCarModal({ open: false })}
          onSubmit={async (data: CarRentalInsert) => {
            if (carModal.editing) await updateCar(carModal.editing.id, data)
            else await createCar(data)
            setCarModal({ open: false })
            toast.success(carModal.editing ? 'Updated' : 'Car rental added')
          }}
        />
      </Modal>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-ink-800 border border-ink-700 rounded-2xl p-5 space-y-3">
          <div className="flex gap-3">
            <div className="w-9 h-9 shimmer rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 shimmer rounded w-1/3" />
              <div className="h-3 shimmer rounded w-1/4" />
            </div>
          </div>
          <div className="h-16 shimmer rounded-xl" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-600">
      {icon}
      <p className="mt-3 text-sm">{label}</p>
    </div>
  )
}
