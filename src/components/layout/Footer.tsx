import { Link } from 'react-router-dom'
import { Plane } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-ink-700/60 bg-ink-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/30">
              <Plane size={11} className="text-ink-950 -rotate-45" />
            </div>
            <span className="font-display font-semibold text-sm text-slate-700">TripCase</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-700 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-700 transition-colors">
              Terms of Service
            </Link>
          </div>

          <p className="text-xs text-slate-600 font-mono">
            Travel smarter. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  )
}
