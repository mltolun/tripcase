import { motion, AnimatePresence } from 'framer-motion'
import { useConsent } from '../../hooks/useConsent'
import { Button } from '../ui/Button'
import { Link } from 'react-router-dom'

export function ConsentBanner() {
  const { consented, giveConsent } = useConsent()

  return (
    <AnimatePresence>
      {!consented && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-2xl mx-auto bg-ink-800 border border-ink-700 rounded-2xl shadow-xl shadow-black/10 p-4 flex items-start gap-3">
            <div className="flex-1 text-xs text-slate-500 leading-relaxed">
              This site uses local storage for authentication and core functionality.
              No tracking or analytics cookies are used.{' '}
              <Link to="/privacy" className="text-amber-400 hover:text-amber-300 underline">
                Learn more
              </Link>
            </div>
            <Button variant="primary" size="sm" onClick={giveConsent}>
              Got it
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
