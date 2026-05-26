import { useState, useEffect, type FormEvent } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { FlightInsert, Layover, Flight } from '../../lib/database.types'
import { Plus, Trash2, Clock } from 'lucide-react'
import { lookupFlight, parseFlightNumber, type FlightLookupResult } from '../../lib/flightApi'
import { airlineLogoUrl, formatTime, formatDate, localDateStr } from '../../lib/utils'

interface FlightFormProps {
  initial?: Partial<Flight>
  onSubmit: (data: FlightInsert) => Promise<void>
  onCancel: () => void
  tripId: string
  userId: string
}

const FLIGHT_CLASSES = ['economy', 'premium economy', 'business', 'first']

export function FlightForm({ initial, onSubmit, onCancel, tripId, userId }: FlightFormProps) {
  const [loading, setLoading] = useState(false)
  const [layovers, setLayovers] = useState<Layover[]>(
    (initial?.layovers as Layover[] | null) ?? []
  )
  const [flightCode, setFlightCode] = useState(initial?.flight_number ?? '')
  const [departureDate, setDepartureDate] = useState(initial?.departure_time?.slice(0, 10) ?? '')
  const [lookupResult, setLookupResult] = useState<FlightLookupResult | null>(null)
  const [departureTime, setDepartureTime] = useState(initial?.departure_time?.slice(11, 16) ?? '')
  const [arrivalTime, setArrivalTime] = useState(initial?.arrival_time?.slice(11, 16) ?? '')
  const [logoError, setLogoError] = useState(false)

  const isEditing = !!initial?.id

  useEffect(() => {
    if (isEditing) return
    const code = flightCode.trim()
    if (!code || !departureDate) return
    const parsed = parseFlightNumber(code)
    if (!parsed) return

    const timer = setTimeout(async () => {
      try {
        const result = await lookupFlight(parsed.airline, code)
        setLookupResult(result)
      } catch {
        setLookupResult(null)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [isEditing, flightCode, departureDate])

  useEffect(() => {
    if (!lookupResult) return
    if (!departureTime && lookupResult.departure_time) {
      setDepartureTime(lookupResult.departure_time.slice(0, 5))
    }
    if (!arrivalTime && lookupResult.arrival_time) {
      setArrivalTime(lookupResult.arrival_time.slice(0, 5))
    }
  }, [lookupResult])

  function addLayover() {
    setLayovers(prev => [...prev, { airport_code: '', airport_name: '', duration_minutes: 60 }])
  }
  function removeLayover(i: number) {
    setLayovers(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateLayover(i: number, field: keyof Layover, value: string | number) {
    setLayovers(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const g = (k: string) => (fd.get(k) as string) || null

    const parsed = parseFlightNumber(flightCode.trim())

    const effectiveDepTime = departureTime || lookupResult?.departure_time?.slice(0, 5) || initial?.departure_time?.slice(11, 16) || ''
    const effectiveArrTime = arrivalTime || lookupResult?.arrival_time?.slice(0, 5) || initial?.arrival_time?.slice(11, 16) || ''

    if (!departureDate || !effectiveDepTime || !effectiveArrTime) {
      setLoading(false)
      return
    }

    const combinedDeparture = `${departureDate}T${effectiveDepTime}:00Z`
    const combinedArrival = `${departureDate}T${effectiveArrTime}:00Z`

    await onSubmit({
      trip_id: tripId,
      user_id: userId,
      airline_name: lookupResult?.airline_name ?? initial?.airline_name ?? parsed?.airline ?? '',
      airline_iata: lookupResult?.airline_iata ?? initial?.airline_iata ?? parsed?.airline ?? null,
      flight_number: parsed ? `${parsed.airline}${parsed.number}` : flightCode,
      departure_airport_code: lookupResult?.departure_airport_code ?? initial?.departure_airport_code ?? '',
      departure_airport_name: lookupResult?.departure_airport_name ?? initial?.departure_airport_name ?? null,
      arrival_airport_code: lookupResult?.arrival_airport_code ?? initial?.arrival_airport_code ?? '',
      arrival_airport_name: lookupResult?.arrival_airport_name ?? initial?.arrival_airport_name ?? null,
      departure_time: combinedDeparture,
      arrival_time: combinedArrival,
      departure_time_local: lookupResult?.departure_time_local ?? initial?.departure_time_local ?? null,
      arrival_time_local: lookupResult?.arrival_time_local ?? initial?.arrival_time_local ?? null,
      aircraft_type: lookupResult?.aircraft_type ?? initial?.aircraft_type ?? null,
      flight_class: g('flight_class'),
      status: lookupResult?.status?.toLowerCase() ?? initial?.status ?? 'scheduled',
      booking_reference: g('booking_reference'),
      layovers: layovers.length ? layovers : null,
      notes: g('notes'),
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Flight Code"
        value={flightCode}
        onChange={e => setFlightCode(e.target.value.toUpperCase())}
        placeholder="IB0150"
      />
      <Input
        label="Departure Date"
        type="date"
        value={departureDate}
        onChange={e => setDepartureDate(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Departure Time"
          type="time"
          value={departureTime}
          onChange={e => setDepartureTime(e.target.value)}
          required
        />
        <Input
          label="Arrival Time"
          type="time"
          value={arrivalTime}
          onChange={e => setArrivalTime(e.target.value)}
          required
        />
      </div>

      {(lookupResult || (isEditing && initial)) && (() => {
        const r = lookupResult ?? initial
        if (!r) return null
        const iata = r.airline_iata ?? null
        const depLocal = lookupResult ? (lookupResult.departure_time_local ?? null) : null
        const arrLocal = lookupResult ? (lookupResult.arrival_time_local ?? null) : null
        const depUtcFull = lookupResult && departureDate ? `${departureDate}T${lookupResult.departure_time}:00Z` : (r.departure_time ?? '')
        const arrUtcFull = lookupResult && departureDate ? `${departureDate}T${lookupResult.arrival_time}:00Z` : (r.arrival_time ?? '')
        const depTimeUtc = lookupResult ? lookupResult.departure_time : r.departure_time
        const arrTimeUtc = lookupResult ? lookupResult.arrival_time : r.arrival_time
        return (
        <div className="bg-ink-700/40 border border-ink-600 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            {iata && !logoError ? (
              <img
                src={airlineLogoUrl(iata)}
                alt=""
                onError={() => setLogoError(true)}
                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-ink-700 border border-ink-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {(r.airline_iata ?? r.airline_name?.slice(0, 2) ?? '').toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-display font-semibold text-sm text-slate-900">{r.airline_name}</p>
              <p className="text-xs text-slate-500 font-mono">
                {r.flight_number}{r.aircraft_type ? ` · ${r.aircraft_type}` : ''}
              </p>
            </div>
          </div>

          <div className="text-center mb-3">
            <span className="text-xs text-slate-500 font-mono">
              {formatDate(localDateStr(depUtcFull, depLocal), 'EEE d MMM')}
              {depLocal && ` · ${formatTime(depUtcFull)}`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="text-center">
              <p className="font-display font-bold text-xl text-slate-900 leading-none">
                {formatTime(depLocal ?? depUtcFull) || '--:--'}
              </p>
              <p className="font-mono font-bold text-xs text-amber-400 mt-0.5">{r.departure_airport_code}</p>
              <p className="text-[10px] text-slate-500 truncate max-w-24">{r.departure_airport_name}</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock size={10} />
                <span className="font-mono">
                  {depTimeUtc && arrTimeUtc
                    ? (() => {
                        const [dh, dm] = depTimeUtc.split(':').map(Number)
                        const [ah, am] = arrTimeUtc.split(':').map(Number)
                        let diff = (ah * 60 + am) - (dh * 60 + dm)
                        if (diff < 0) diff += 24 * 60
                        return `${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`
                      })()
                    : '--'}
                </span>
              </div>
              <div className="relative w-20 h-px bg-ink-600">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">nonstop</span>
            </div>

            <div className="text-center">
              <p className="font-display font-bold text-xl text-slate-900 leading-none">
                {formatTime(arrLocal ?? arrUtcFull) || '--:--'}
              </p>
              <p className="font-mono font-bold text-xs text-sky-400 mt-0.5">{r.arrival_airport_code}</p>
              <p className="text-[10px] text-slate-500 truncate max-w-24">{r.arrival_airport_name}</p>
            </div>
          </div>
        </div>
      )})()}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">Class</label>
          <select name="flight_class" defaultValue={initial?.flight_class ?? 'economy'}
            className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-400/60">
            {FLIGHT_CLASSES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        {lookupResult?.status && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">Status</label>
            <div className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-mono capitalize">
              {lookupResult.status.toLowerCase()}
            </div>
          </div>
        )}
      </div>

      <Input label="Booking Reference" name="booking_reference" defaultValue={initial?.booking_reference ?? ''} placeholder="XYZABC" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">Layovers</span>
          <Button type="button" variant="ghost" size="sm" onClick={addLayover} className="h-6 px-2 text-xs gap-1">
            <Plus size={10} /> Add layover
          </Button>
        </div>
        {layovers.map((lyr, i) => (
          <div key={i} className="flex gap-2 items-start bg-ink-700/40 rounded-xl p-3">
            <div className="grid grid-cols-3 gap-2 flex-1">
              <input placeholder="Code (e.g. ORD)" value={lyr.airport_code} onChange={e => updateLayover(i, 'airport_code', e.target.value.toUpperCase())}
                maxLength={3}
                className="bg-ink-800 border border-ink-600 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-amber-400/40" />
              <input placeholder="Airport name (optional)" value={lyr.airport_name ?? ''} onChange={e => updateLayover(i, 'airport_name', e.target.value)}
                className="bg-ink-800 border border-ink-600 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-400/40" />
              <input type="number" placeholder="Duration (min)" value={lyr.duration_minutes} onChange={e => updateLayover(i, 'duration_minutes', parseInt(e.target.value) || 0)}
                className="bg-ink-800 border border-ink-600 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-400/40" />
            </div>
            <button type="button" onClick={() => removeLayover(i)} className="text-slate-500 hover:text-rose-400 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <Input label="Notes" name="notes" defaultValue={initial?.notes ?? ''} placeholder="Optional notes..." />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}>{initial?.id ? 'Save changes' : 'Add flight'}</Button>
      </div>
    </form>
  )
}
