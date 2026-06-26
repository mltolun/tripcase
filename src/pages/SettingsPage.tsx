import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings, Download, Trash2, AlertTriangle, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  async function handleExport() {
    if (!user) return
    setExporting(true)
    try {
      const [trips, flights, hotels, cars] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', user.id),
        supabase.from('flights').select('*').eq('user_id', user.id),
        supabase.from('hotels').select('*').eq('user_id', user.id),
        supabase.from('car_rentals').select('*').eq('user_id', user.id),
      ])

      const data = {
        exported_at: new Date().toISOString(),
        user: { email: user.email, id: user.id, created_at: user.created_at },
        trips: trips.data ?? [],
        flights: flights.data ?? [],
        hotels: hotels.data ?? [],
        car_rentals: cars.data ?? [],
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tripcase-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user) return
    setDeleting(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Failed to delete account')
      toast.success('Account deleted')
      navigate('/')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Settings size={22} className="text-slate-500" />
            <h1 className="font-display font-bold text-2xl text-slate-900">Settings</h1>
          </div>

          {/* Account info */}
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 shadow-xl shadow-black/10 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <User size={18} className="text-amber-400" />
              <h2 className="font-display font-semibold text-lg text-slate-900">Account</h2>
            </div>
            <p className="text-sm text-slate-500">
              Signed in as <span className="font-mono text-slate-700">{user?.email}</span>
            </p>
          </div>

          {/* Data Export */}
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 shadow-xl shadow-black/10 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Download size={18} className="text-amber-400" />
              <h2 className="font-display font-semibold text-lg text-slate-900">Export Your Data</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Download all your trips, flights, hotels, and car rentals as a JSON file.
              Your data will be exported in a machine-readable format.
            </p>
            <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
              <Download size={14} />
              Export as JSON
            </Button>
          </div>

          {/* Account Deletion */}
          <div className="bg-ink-800 border border-rose-400/20 rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3 mb-2">
              <Trash2 size={18} className="text-rose-400" />
              <h2 className="font-display font-semibold text-lg text-slate-900">Delete Account</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
              We recommend exporting your data first.
            </p>

            {deleting ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Type <strong className="text-rose-400">delete my account</strong> to confirm.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="delete my account"
                  className="w-full bg-ink-950 border border-ink-600 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-600 focus:outline-none focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/30"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={confirmText !== 'delete my account'}
                    loading={deleting}
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 size={14} />
                    Delete forever
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-rose-400/5 border border-rose-400/10 rounded-xl mb-4">
                  <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-400/80">
                    This will permanently remove all your trips and data. Export first if needed.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setDeleting(true)}>
                  <Trash2 size={14} />
                  Delete account
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
