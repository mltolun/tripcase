import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2, PlaneTakeoff, PlaneLanding, Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import type { Flight, Layover } from '../../lib/database.types'
import { formatDate, formatTime, formatDurationMinutes, FLIGHT_STATUS_COLORS, airlineLogoUrl, compareTimes } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'

interface FlightCardProps {
  flight: Flight
  onEdit?: (flight: Flight) => void
  onDelete?: (id: string) => void
  onRefreshStatus?: (id: string) => Promise<void>
  readonly?: boolean
}

export function FlightCard({ flight, onEdit, onDelete, onRefreshStatus, readonly }: FlightCardProps) {
  const [logoError, setLogoError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const layovers = (flight.layovers as Layover[] | null) ?? []
  const statusColor = FLIGHT_STATUS_COLORS[flight.status] ?? FLIGHT_STATUS_COLORS.unknown

  async function handleRefresh() {
    if (!onRefreshStatus) return
    setRefreshing(true)
    await onRefreshStatus(flight.id)
    setRefreshing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden hover:border-ink-500 transition-all"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="p-5">
        {/* Header: airline + date + status */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {!logoError && flight.airline_iata ? (
              <img
                src={airlineLogoUrl(flight.airline_iata)}
                alt={flight.airline_name}
                onError={() => setLogoError(true)}
                className="w-9 h-9 rounded-lg object-contain bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-ink-700 border border-ink-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {(flight.airline_iata ?? flight.airline_name.slice(0, 2)).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-display font-semibold text-sm text-slate-900">{flight.airline_name}</p>
              <p className="text-sm text-slate-600 font-mono">
                {flight.flight_number ?? '–'}{flight.aircraft_type ? ` · ${flight.aircraft_type}` : ''}
              </p>
              {flight.operating_airline_iata && flight.operating_airline_iata !== flight.airline_iata && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Operated by {flight.operating_airline_name ?? flight.operating_airline_iata}
                  {flight.operating_flight_number ? ` (${flight.operating_flight_number})` : ''}
                </p>
              )}
              <p className="text-xs text-slate-500 font-mono mt-0.5 sm:hidden">
                {formatDate(flight.departure_time, 'EEE d MMM', flight.departure_airport_code)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn(statusColor)} dot>
              {flight.status}
            </Badge>
            <span className="text-sm text-slate-600 font-mono hidden sm:block">
              {formatDate(flight.departure_time, 'EEE d MMM', flight.departure_airport_code)}
            </span>
          </div>
        </div>

        {/* Flight route */}
        <div className="flex items-center gap-4">
          {/* Departure */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <PlaneTakeoff size={12} className="text-amber-400 shrink-0" />
              <span className="text-sm text-slate-600 truncate font-mono">{flight.departure_airport_name ?? flight.departure_airport_code}</span>
            </div>
            <p className="font-display font-bold text-xl sm:text-2xl text-slate-900 leading-none">
              {formatTime(flight.scheduled_departure_time ?? flight.departure_time, flight.departure_airport_code)}
            </p>
            <p className="font-mono font-bold text-sm text-amber-400 mt-0.5">{flight.departure_airport_code}</p>
            {(() => {
              const cmp = compareTimes(flight.departure_time, flight.scheduled_departure_time)
              if (!cmp || cmp === 'on-time') return null
              return (
                <p className={`text-xs font-mono mt-0.5 ${cmp === 'delayed' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  Actual: {formatTime(flight.departure_time, flight.departure_airport_code)}
                </p>
              )
            })()}
            {(flight.departure_terminal || flight.departure_gate) && (
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {flight.departure_terminal && `T${flight.departure_terminal}`}
                {flight.departure_terminal && flight.departure_gate && ' · '}
                {flight.departure_gate && `Gate ${flight.departure_gate}`}
              </p>
            )}
          </div>

          {/* Duration + path */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[90px]">
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <Clock size={12} />
              <span className="font-mono">{formatDurationMinutes(flight.duration_minutes)}</span>
            </div>
            <div className="relative w-full h-[2px] bg-ink-600 rounded-full">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400" />
              {layovers.length > 0 && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-ink-700 border border-slate-400" />
              )}
            </div>
            {layovers.length > 0 ? (
              <span className="text-xs text-slate-600 font-mono">{layovers.length} stop{layovers.length > 1 ? 's' : ''}</span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-mono">nonstop</span>
            )}
          </div>

          {/* Arrival */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <span className="text-sm text-slate-600 truncate font-mono">{flight.arrival_airport_name ?? flight.arrival_airport_code}</span>
              <PlaneLanding size={12} className="text-sky-400 shrink-0" />
            </div>
            <p className="font-display font-bold text-xl sm:text-2xl text-slate-900 leading-none">
              {formatTime(flight.scheduled_arrival_time ?? flight.arrival_time, flight.arrival_airport_code)}
            </p>
            <p className="font-mono font-bold text-sm text-sky-400 mt-0.5">{flight.arrival_airport_code}</p>
            {(() => {
              const cmp = compareTimes(flight.arrival_time, flight.scheduled_arrival_time)
              if (!cmp || cmp === 'on-time') return null
              return (
                <p className={`text-xs font-mono mt-0.5 ${cmp === 'delayed' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  Actual: {formatTime(flight.arrival_time, flight.arrival_airport_code)}
                </p>
              )
            })()}
            {(flight.arrival_terminal || flight.arrival_gate) && (
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {flight.arrival_terminal && `T${flight.arrival_terminal}`}
                {flight.arrival_terminal && flight.arrival_gate && ' · '}
                {flight.arrival_gate && `Gate ${flight.arrival_gate}`}
              </p>
            )}
          </div>
        </div>

        {/* Layover details */}
        {layovers.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {layovers.map((lyr, i) => (
              <div key={i} className="flex items-center gap-2 bg-ink-700/50 rounded-lg px-3 py-1.5">
                <div className="w-1 h-1 rounded-full bg-slate-400" />
                <span className="text-xs text-slate-400 font-mono">
                  {Math.floor(lyr.duration_minutes / 60)}h {lyr.duration_minutes % 60}m layover — {lyr.airport_name ?? lyr.airport_code} ({lyr.airport_code})
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {(flight.flight_class || flight.arrival_baggage || !readonly) && (
          <div className="mt-4 pt-4 border-t border-ink-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {flight.arrival_baggage && (
                <span className="text-sm text-slate-600 font-mono">
                  Baggage: <span className="text-slate-700">{flight.arrival_baggage}</span>
                </span>
              )}
              {!readonly && flight.booking_reference && (
                <span className="text-sm font-mono text-slate-600">
                  Ref: <span className="text-slate-700 font-medium">{flight.booking_reference}</span>
                </span>
              )}
              {flight.flight_class && (
                <span className="text-sm text-slate-600 capitalize">{flight.flight_class}</span>
              )}
            </div>
            {!readonly && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onRefreshStatus && (
                  <Button variant="ghost" size="sm" onClick={handleRefresh} loading={refreshing} className="h-7 px-2">
                    <RefreshCw size={12} />
                  </Button>
                )}
                {onEdit && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(flight)} className="h-7 px-2">
                    <Pencil size={12} />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(flight.id)} className="h-7 px-2">
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} size="sm">
        <div className="text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-rose-400/10 flex items-center justify-center mb-3">
            <AlertTriangle size={20} className="text-rose-400" />
          </div>
          <h3 className="font-display font-semibold text-slate-900 mb-1">Delete flight?</h3>
          <p className="text-sm text-slate-500 mb-5">
            {flight.airline_name} {flight.flight_number} · {flight.departure_airport_code} → {flight.arrival_airport_code}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => { onDelete?.(deleteConfirm!); setDeleteConfirm(null) }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
