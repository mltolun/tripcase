import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, MapPin } from 'lucide-react'
import { useTrips } from '../hooks/useTrips'
import { TripCard } from '../components/trips/TripCard'
import { EditTripModal } from '../components/trips/EditTripModal'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import type { Trip } from '../lib/database.types'
import toast from 'react-hot-toast'

export function DashboardPage() {
  const { trips, loading, createTrip, deleteTrip, updateTrip } = useTrips()
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editTrip, setEditTrip] = useState<Trip | null>(null)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true)
    const fd = new FormData(e.currentTarget)
    const city = fd.get('city') as string
    const { error } = await createTrip(
      fd.get('name') as string,
      fd.get('description') as string || undefined,
      city || undefined
    )
    if (error) toast.error(error)
    else { toast.success('Trip created!'); setCreateOpen(false) }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trip and all its bookings?')) return
    const { error } = await deleteTrip(id)
    if (error) toast.error(error)
    else toast.success('Trip deleted')
  }

  async function handleTogglePublic(id: string, current: boolean) {
    const { error } = await updateTrip(id, { is_public: !current })
    if (error) toast.error(error)
    else toast.success(current ? 'Trip set to private' : 'Trip is now public — share link copied!')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display font-bold text-3xl text-slate-900">
          My trips
        </h1>
        <p className="text-slate-600 mt-1">
          {trips.length === 0 ? 'No trips yet — create your first one below.' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} tracked`}
        </p>
      </motion.div>

      {/* Trips grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-ink-800 rounded-2xl overflow-hidden border border-ink-700">
              <div className="h-28 shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-4 shimmer rounded w-3/4" />
                <div className="h-3 shimmer rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* New trip card - always first */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setCreateOpen(true)}
            className="group min-h-[200px] bg-amber-400/5 border border-dashed border-amber-400/30 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-amber-400/10 hover:border-amber-400/60 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover:bg-amber-400/20 transition-colors">
              <Plus size={20} className="text-amber-400" />
            </div>
            <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">New trip</span>
          </motion.button>

          {trips.map((trip, i) => (
            <TripCard
              key={trip.id}
              trip={trip}
              index={i}
              onDelete={handleDelete}
              onTogglePublic={handleTogglePublic}
              onEdit={setEditTrip}
            />
          ))}
        </div>
      )}

      {/* Create trip modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New trip">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Trip name" name="name" required autoFocus placeholder="Summer Europe 2026" />
          <Input label="Description (optional)" name="description" placeholder="2 weeks through Spain and Portugal" />
          <Input label="City / destination" name="city" placeholder="e.g. Paris, Barcelona, Tokyo" icon={<MapPin size={14} />} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={creating}>Create trip</Button>
          </div>
        </form>
      </Modal>

      {/* Edit trip modal */}
      {editTrip && (
        <EditTripModal
          open={!!editTrip}
          onClose={() => setEditTrip(null)}
          trip={editTrip}
          onSave={updateTrip}
        />
      )}
    </div>
  )
}
