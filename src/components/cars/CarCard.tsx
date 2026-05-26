import { motion } from 'framer-motion'
import { Pencil, Trash2, MapPin, Calendar } from 'lucide-react'
import type { CarRental } from '../../lib/database.types'
import { formatDate, nightsBetween } from '../../lib/utils'
import { Button } from '../ui/Button'

interface CarCardProps {
  car: CarRental
  onEdit?: (car: CarRental) => void
  onDelete?: (id: string) => void
  readonly?: boolean
}

export function CarCard({ car, onEdit, onDelete, readonly }: CarCardProps) {
  const days = nightsBetween(car.pickup_date, car.dropoff_date)

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="group relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden hover:border-ink-500 transition-all"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🚗</span>
            </div>
            <div>
              <p className="font-display font-semibold text-slate-900">{car.company_name}</p>
              {car.car_type && <p className="text-sm text-slate-600 mt-0.5">{car.car_type}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-display font-bold text-slate-900">{days}</span>
            <span className="text-sm text-slate-600 ml-1">day{days !== 1 ? 's' : ''}</span>
            {car.total_price && (
              <p className="text-sm text-slate-600 font-mono mt-0.5">
                {car.currency ?? 'USD'} {car.total_price.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-ink-700/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={10} className="text-sky-400" />
                <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Pick-up</span>
              </div>
              <p className="font-mono text-sm font-medium text-slate-800">{formatDate(car.pickup_date)}</p>
              {car.pickup_location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={11} className="text-slate-600" />
                  <p className="text-xs text-slate-600 truncate">{car.pickup_location}</p>
                </div>
              )}
            </div>
            <div className="bg-ink-700/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={10} className="text-slate-400" />
                <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Drop-off</span>
              </div>
              <p className="font-mono text-sm font-medium text-slate-800">{formatDate(car.dropoff_date)}</p>
              {car.dropoff_location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={11} className="text-slate-600" />
                  <p className="text-xs text-slate-600 truncate">{car.dropoff_location}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {(car.booking_reference || !readonly) && (
          <div className="mt-4 pt-4 border-t border-ink-700 flex items-center justify-between">
            {car.booking_reference && (
              <span className="text-sm font-mono text-slate-600">
                Ref: <span className="text-slate-700">{car.booking_reference}</span>
              </span>
            )}
            {!readonly && (
              <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(car)} className="h-7 px-2"><Pencil size={12} /></Button>}
                {onDelete && <Button variant="danger" size="sm" onClick={() => onDelete(car.id)} className="h-7 px-2"><Trash2 size={12} /></Button>}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
