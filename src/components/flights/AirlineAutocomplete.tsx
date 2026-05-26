import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { searchAirlines, airlineLogoUrl, type Airline } from '../../lib/airlines'
import { cn } from '../../lib/utils'

interface AirlineAutocompleteProps {
  defaultName?: string
  defaultIata?: string
  onSelect: (airline: Airline) => void
}

export function AirlineAutocomplete({ defaultName, defaultIata, onSelect }: AirlineAutocompleteProps) {
  const [query, setQuery] = useState(defaultName ?? '')
  const [iata, setIata] = useState(defaultIata ?? '')
  const [results, setResults] = useState<Airline[]>([])
  const [open, setOpen] = useState(false)
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set())
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [cursor, setCursor] = useState(-1)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setIata('')
    const found = searchAirlines(val)
    setResults(found)
    setOpen(found.length > 0)
    setCursor(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      pick(results[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function pick(airline: Airline) {
    setQuery(airline.name)
    setIata(airline.iata)
    setResults([])
    setOpen(false)
    setCursor(-1)
    onSelect(airline)
  }

  return (
    <div ref={wrapperRef} className="grid grid-cols-2 gap-3 relative">
      {/* Airline name with dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">
          Airline Name
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (results.length > 0) setOpen(true) }}
            placeholder="American Airlines"
            autoComplete="off"
            name="airline_name"
            required
            className="w-full bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
          />

          {open && results.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-ink-900 border border-ink-600 rounded-xl shadow-2xl shadow-black/60 overflow-hidden max-h-64 overflow-y-auto"
            >
              {results.map((airline, i) => (
                <li key={airline.iata}>
                  <button
                    type="button"
                    onMouseDown={() => pick(airline)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      cursor === i ? 'bg-ink-700' : 'hover:bg-ink-800'
                    )}
                  >
                    {logoErrors.has(airline.iata) ? (
                      <div className="w-7 h-7 rounded bg-ink-700 border border-ink-600 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono font-bold text-amber-400">{airline.iata}</span>
                      </div>
                    ) : (
                      <img
                        src={airlineLogoUrl(airline.iata)}
                        alt={airline.name}
                        onError={() => setLogoErrors(prev => new Set(prev).add(airline.iata))}
                        className="w-7 h-7 rounded object-contain bg-white p-0.5 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{airline.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{airline.iata} · {airline.country}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* IATA code — auto-filled but still editable */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">
          IATA Code
        </label>
        <input
          type="text"
          value={iata}
          onChange={e => setIata(e.target.value.toUpperCase())}
          placeholder="AA"
          maxLength={3}
          name="airline_iata"
          className="w-full bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-600 font-mono uppercase focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
        />
      </div>
    </div>
  )
}
