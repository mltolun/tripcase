import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MoreVertical, Trash2, Globe, Lock, Pencil } from 'lucide-react'
import type { Trip } from '../../lib/database.types'
import { formatDate } from '../../lib/utils'
import { useState, useRef, useEffect } from 'react'

interface TripCardProps {
  trip: Trip
  onDelete: (id: string) => void
  onTogglePublic: (id: string, current: boolean) => void
  onEdit: (trip: Trip) => void
  index: number
}

export function TripCard({ trip, onDelete, onTogglePublic, onEdit, index }: TripCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden hover:border-ink-500 transition-all hover:shadow-lg hover:shadow-black/10"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

      {/* Cover image or emoji header */}
      <Link to={`/trip/${trip.id}`} className="block">
        <div className="h-28 bg-gradient-to-br from-ink-700 to-ink-800 flex items-center justify-center relative overflow-hidden">
          {trip.cover_image_url ? (
            <img src={trip.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-grid-pattern opacity-50" />
              <span className="text-5xl filter drop-shadow-lg select-none">{trip.cover_emoji ?? '✈️'}</span>
            </>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/trip/${trip.id}`} className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-slate-900 line-clamp-2 hover:text-amber-400 transition-colors leading-tight">{trip.name}</h3>
            {trip.description && (
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{trip.description}</p>
            )}
          </Link>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="text-slate-500 hover:text-slate-700 p-1 rounded-lg hover:bg-ink-700 transition-colors">
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-full mt-1 z-20 bg-ink-800 border border-ink-600 rounded-xl shadow-xl shadow-black/15 py-1 min-w-[160px]"
              >
                <button
                  onClick={() => { onEdit(trip); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-ink-700 hover:text-slate-900 transition-colors"
                >
                  <Pencil size={12} />
                  Edit trip
                </button>
                <button
                  onClick={() => { onTogglePublic(trip.id, trip.is_public); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-ink-700 hover:text-slate-900 transition-colors"
                >
                  {trip.is_public ? <Lock size={12} /> : <Globe size={12} />}
                  {trip.is_public ? 'Make private' : 'Make public'}
                </button>
                {trip.is_public && (
                  <button
                    onClick={() => {                     navigator.clipboard.writeText(`${window.location.origin}/share/${trip.share_token}`); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-ink-700 hover:text-slate-900 transition-colors"
                  >
                    <Globe size={12} className="text-sky-400" />
                    Copy share link
                  </button>
                )}
                <hr className="border-ink-700 my-1" />
                <button
                  onClick={() => { onDelete(trip.id); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500 hover:text-white active:bg-rose-600 transition-colors"
                >
                  <Trash2 size={12} />
                  Delete trip
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {(trip.start_date || trip.end_date) && (
          <p className="text-sm text-slate-600 font-mono mt-2">
            {(() => {
              const s = trip.start_date, e = trip.end_date
              const sy = s ? new Date(s).getFullYear() : null
              const ey = e ? new Date(e).getFullYear() : null
              if (s && e) {
                if (sy === ey) return `${formatDate(s)} — ${formatDate(e)}, ${sy}`
                return `${formatDate(s)}, ${sy} — ${formatDate(e)}, ${ey}`
              }
              if (s) return `${formatDate(s)}, ${sy}`
              if (e) return `${formatDate(e)}, ${ey}`
            })()}
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          {trip.is_public ? (
            <span className="flex items-center gap-1 text-xs text-sky-400 bg-sky-400/10 rounded-full px-2 py-0.5 font-mono">
              <Globe size={11} /> public
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-600 bg-ink-700 rounded-full px-2 py-0.5 font-mono">
              <Lock size={11} /> private
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
