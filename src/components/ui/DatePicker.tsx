import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Calendar } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DatePickerProps {
  label?: string
  value?: string
  onChange?: (date: string) => void
  name?: string
  required?: boolean
  placeholder?: string
  className?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DatePicker({ label, value, onChange, name, required, placeholder, className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const selected = value ? new Date(value + 'T00:00:00') : undefined

  function handleSelect(date: Date | undefined) {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      onChange?.(`${y}-${m}-${d}`)
    }
    setOpen(false)
  }

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      let left = r.left
      const popoverWidth = 280
      if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 8
      }
      setPos({ top: r.bottom + 4, left })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const displayValue = value
    ? (() => {
        const d = new Date(value + 'T00:00:00')
        return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
      })()
    : ''

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">
          {label}
          {required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
      )}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-left transition-all flex items-center gap-2',
          'focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30',
          'hover:border-ink-500',
          value ? 'text-slate-800' : 'text-slate-600'
        )}
      >
        <Calendar size={14} className="text-slate-400 shrink-0" />
        <span>{displayValue || placeholder || 'Select date...'}</span>
      </button>
      <input type="hidden" name={name} value={value ?? ''} />
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-ink-800 border border-ink-600 rounded-xl shadow-xl overflow-hidden p-2"
        >
          <div
            style={{
              '--rdp-accent-color': '#fbbf24',
              '--rdp-accent-background-color': 'rgba(251, 191, 36, 0.15)',
              '--rdp-day-height': '40px',
              '--rdp-day-width': '40px',
              '--rdp-day_button-height': '38px',
              '--rdp-day_button-width': '38px',
              '--rdp-today-color': '#fbbf24',
              '--rdp-nav_button-height': '2rem',
              '--rdp-nav_button-width': '2rem',
              '--rdp-nav-height': '2.25rem',
              '--rdp-range_start-color': '#0f0f14',
              '--rdp-range_end-color': '#0f0f14',
              '--rdp-range_start-date-background-color': '#fbbf24',
              '--rdp-range_end-date-background-color': '#fbbf24',
            } as React.CSSProperties}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected || new Date()}
              required={required}
              showOutsideDays
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
