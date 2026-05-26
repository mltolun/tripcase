import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-600',
              'focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all',
              icon && 'pl-10',
              error && 'border-rose-400/60',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-400 uppercase tracking-wider font-display">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-600 resize-none',
            'focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all',
            error && 'border-rose-400/60',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
