import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const { error } = await signIn(fd.get('email') as string, fd.get('password') as string)
    if (error) { setError(error.message); setLoading(false) }
    else { toast.success('Welcome back!'); navigate('/') }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400 shadow-lg shadow-amber-400/30 mb-4">
            <Plane size={22} className="text-ink-950 -rotate-45" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your TripCase account</p>
        </div>

        <div className="bg-ink-800 border border-ink-600 rounded-2xl p-6 shadow-xl shadow-black/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" name="email" type="email" required autoFocus placeholder="you@example.com" />
            <Input label="Password" name="password" type="password" required placeholder="••••••••" />
            {error && <p className="text-sm text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          No account?{' '}
          <Link to="/signup" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
