import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { fetchCityPhoto } from '../../lib/utils'
import type { Trip, TripUpdate } from '../../lib/database.types'
import toast from 'react-hot-toast'

interface EditTripModalProps {
  open: boolean
  onClose: () => void
  trip: Trip
  onSave: (id: string, updates: TripUpdate) => Promise<{ error: string | null }>
}

export function EditTripModal({ open, onClose, trip, onSave }: EditTripModalProps) {
  const [saving, setSaving] = useState(false)
  const [fetchingPhoto, setFetchingPhoto] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const description = fd.get('description') as string
    const city = fd.get('city') as string
    const manualImageUrl = fd.get('imageUrl') as string

    const updates: TripUpdate = { name, description: description || null }

    if (manualImageUrl) {
      updates.cover_image_url = manualImageUrl
    } else if (city) {
      setFetchingPhoto(true)
      const photoUrl = await fetchCityPhoto(city)
      setFetchingPhoto(false)
      if (photoUrl) {
        updates.cover_image_url = photoUrl
      } else {
        toast.error('No photo found for that city')
        setSaving(false)
        return
      }
    }

    const { error } = await onSave(trip.id, updates)
    if (error) toast.error(error)
    else { toast.success('Trip updated!'); onClose() }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit trip">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Trip name" name="name" defaultValue={trip.name} required autoFocus />
        <Input label="Description (optional)" name="description" defaultValue={trip.description ?? ''} />

        <div className="border-t border-ink-700 pt-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display mb-3">Cover image</p>

          {trip.cover_image_url && (
            <div className="mb-3 rounded-xl overflow-hidden h-28">
              <img src={trip.cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <Input label="City / destination (fetch photo)" name="city" placeholder="e.g. Paris" />
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-ink-700" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-ink-700" />
          </div>
          <Input label="Image URL (manual)" name="imageUrl" placeholder="https://..." />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving || fetchingPhoto}>
            {fetchingPhoto ? 'Fetching photo...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
