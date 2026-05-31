import { motion } from 'framer-motion'
import { Pencil, Trash2, MapPin, Calendar, Moon, Building2, FileText } from 'lucide-react'
import type { Hotel } from '../../lib/database.types'
import { formatDate, nightsBetween } from '../../lib/utils'
import { Button } from '../ui/Button'

interface HotelCardProps {
  hotel: Hotel
  onEdit?: (hotel: Hotel) => void
  onDelete?: (id: string) => void
  readonly?: boolean
}

export function HotelCard({ hotel, onEdit, onDelete, readonly }: HotelCardProps) {
  const nights = nightsBetween(hotel.check_in_date, hotel.check_out_date)

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="group relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden hover:border-ink-500 transition-all"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display font-semibold text-slate-900 truncate">{hotel.hotel_name}</p>
            {hotel.address && (
              <p className="text-sm text-slate-600 truncate mt-0.5">{hotel.address}</p>
            )}
            {(hotel.city || hotel.country) && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-600 truncate">{[hotel.city, hotel.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <Moon size={11} className="text-emerald-400" />
              <span className="font-display font-bold text-slate-900">{nights}</span>
              <span className="text-sm text-slate-600">night{nights !== 1 ? 's' : ''}</span>
            </div>
            {hotel.total_price && (
              <p className="text-sm text-slate-600 font-mono mt-0.5">
                {hotel.currency ?? 'USD'} {hotel.total_price.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-ink-700/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={10} className="text-emerald-400" />
              <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Check-in</span>
            </div>
            <p className="font-mono text-sm font-medium text-slate-800">{formatDate(hotel.check_in_date)}</p>
          </div>
          <div className="bg-ink-700/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={10} className="text-slate-400" />
              <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Check-out</span>
            </div>
            <p className="font-mono text-sm font-medium text-slate-800">{formatDate(hotel.check_out_date)}</p>
          </div>
        </div>

        {(hotel.room_type || hotel.booking_reference || hotel.confirmation_number) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hotel.room_type && (
              <div className="bg-ink-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 size={10} className="text-emerald-400" />
                  <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Room Type</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{hotel.room_type}</p>
              </div>
            )}
            {hotel.booking_reference && (
              <div className="bg-ink-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText size={10} className="text-emerald-400" />
                  <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Booking Ref</span>
                </div>
                <p className="text-sm font-mono font-medium text-slate-800 truncate">{hotel.booking_reference}</p>
              </div>
            )}
            {hotel.confirmation_number && (
              <div className="bg-ink-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText size={10} className="text-emerald-400" />
                  <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Confirmation</span>
                </div>
                <p className="text-sm font-mono font-medium text-slate-800 truncate">{hotel.confirmation_number}</p>
              </div>
            )}
          </div>
        )}

        {!readonly && (
          <div className="mt-4 pt-4 border-t border-ink-700 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(hotel)} className="h-7 px-2"><Pencil size={12} /></Button>}
            {onDelete && <Button variant="danger" size="sm" onClick={() => onDelete(hotel.id)} className="h-7 px-2"><Trash2 size={12} /></Button>}
          </div>
        )}
      </div>
    </motion.div>
  )
}
