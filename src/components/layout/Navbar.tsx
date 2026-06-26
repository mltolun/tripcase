import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Plane, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/30">
            <Plane size={14} className="text-ink-950 -rotate-45" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-slate-900">
            TripCase
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <User size={12} />
              <span className="font-mono">{user.email}</span>
            </div>
            <Link to="/settings" className="text-slate-500 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-ink-800">
              <Settings size={15} />
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign in</Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>Get started</Button>
          </div>
        )}
      </div>
    </header>
  )
}
