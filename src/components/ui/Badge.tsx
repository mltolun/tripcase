import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium font-mono',
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  )
}
