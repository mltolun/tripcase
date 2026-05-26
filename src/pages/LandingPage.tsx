import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plane, Hotel, Car, LayoutDashboard, Share2, RefreshCw,
  ArrowRight, Globe, Clock, Zap, Check
} from 'lucide-react'
import { Button } from '../components/ui/Button'

const colorStyles = {
  amber: { bg: 'bg-amber-400/10', border: 'border-amber-400/20', text: 'text-amber-400' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', text: 'text-emerald-400' },
  sky: { bg: 'bg-sky-400/10', border: 'border-sky-400/20', text: 'text-sky-400' },
} as const

const features = [
  {
    icon: LayoutDashboard,
    title: 'Trip Dashboard',
    description: 'See all your trips in one place. Create, organize, and manage with cover photos, dates, and descriptions.',
    color: colorStyles.amber,
  },
  {
    icon: Plane,
    title: 'Flight Tracking',
    description: 'Auto-lookup flights by number, track live status, manage layovers, terminals, gates, and booking references.',
    color: colorStyles.amber,
  },
  {
    icon: Hotel,
    title: 'Hotel Bookings',
    description: 'Store check-in/out dates, room types, nightly rates, total prices, and booking references for every stay.',
    color: colorStyles.emerald,
  },
  {
    icon: Car,
    title: 'Car Rentals',
    description: 'Track pickup and drop-off locations, dates, car types, rental companies, and total costs.',
    color: colorStyles.sky,
  },
  {
    icon: Share2,
    title: 'Share Itineraries',
    description: 'Generate a public link for any trip. Friends and family can view your full itinerary in read-only mode.',
    color: colorStyles.sky,
  },
  {
    icon: RefreshCw,
    title: 'Live Status Updates',
    description: 'Refresh flight status with one tap — check delays, cancellations, gate changes, and arrivals in real time.',
    color: colorStyles.emerald,
  },
]

const mockTrips = [
  { name: 'Summer Europe 2026', emoji: '🗼', cities: 'Paris · Barcelona · Rome', date: 'Jun 12 — Jul 3' },
  { name: 'Tokyo Adventure', emoji: '🗾', cities: 'Tokyo · Kyoto · Osaka', date: 'Sep 5 — Sep 19' },
  { name: 'New York Weekend', emoji: '🗽', cities: 'New York City', date: 'Oct 10 — Oct 13' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function LandingPage() {
  return (
    <div className="bg-ink-950">
      {/* ───── Hero ───── */}
      <section className="relative min-h-[calc(100vh-56px)] flex items-center justify-center overflow-hidden pt-14">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-sky-400/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center px-4 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={12} className="text-amber-400" />
            <span className="text-xs font-mono text-amber-400">Your travel, organized</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-slate-900 leading-[1.1] tracking-tight">
            Organize every trip,<br />
            <span className="text-amber-400">from takeoff to touchdown.</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-500 leading-relaxed max-w-lg mx-auto">
            Flights, hotels, car rentals — manage all your travel bookings in one place.
            Share itineraries with anyone, track flight status live.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/signup">
              <Button variant="primary" size="lg" className="gap-2">
                Get started free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="lg">
                Sign in
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> Free to use</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> 200+ airlines</span>
          </div>
        </motion.div>
      </section>

      {/* ───── Features ───── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900">
            Everything you need for stress-free travel
          </h2>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">
            One app to track every detail of your journey, from booking to boarding.
          </p>
        </div>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item}
              className="group relative bg-ink-800 border border-ink-600 rounded-2xl p-5 hover:border-ink-500 transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-10 h-10 rounded-xl ${f.color.bg} border ${f.color.border} flex items-center justify-center mb-3`}>
                <f.icon size={18} className={f.color.text} />
              </div>
              <h3 className="font-display font-semibold text-sm text-slate-900 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ───── Dashboard Preview ───── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900">
            See it in action
          </h2>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">
            A clean dashboard that gives you a bird's-eye view of all your trips.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTrips.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden hover:border-ink-500 transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
              <div className="h-28 bg-gradient-to-br from-ink-700 to-ink-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-50" />
                <span className="text-5xl filter drop-shadow-lg">{t.emoji}</span>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-slate-900 line-clamp-2 leading-tight">{t.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">{t.cities}</p>
                <p className="text-sm text-slate-600 font-mono mt-2">{t.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───── Flight, Hotel, Car Showcase ───── */}
      <section className="bg-ink-900/50 border-y border-ink-700/60 py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900">
              Every booking, in one place
            </h2>
            <p className="mt-3 text-slate-500 max-w-md mx-auto">
              Flights, hotels, and car rentals — add them all and view them side by side.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Flight card mockup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-white border border-ink-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-400">AA</span>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm text-slate-900">American Airlines</p>
                    <p className="text-sm text-slate-600 font-mono">AA100 · Boeing 787</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Plane size={12} className="text-amber-400 shrink-0" />
                      <span className="text-sm text-slate-600 truncate font-mono">New York (JFK)</span>
                    </div>
                    <p className="font-display font-bold text-2xl text-slate-900 leading-none">10:30</p>
                    <p className="font-mono font-bold text-sm text-amber-400 mt-0.5">JFK</p>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[80px]">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Clock size={12} />
                      <span className="font-mono">7h 15m</span>
                    </div>
                    <div className="relative w-full h-[2px] bg-ink-600 rounded-full">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400" />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">nonstop</span>
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="text-sm text-slate-600 truncate font-mono">London (LHR)</span>
                      <Plane size={12} className="text-sky-400 shrink-0 rotate-180" />
                    </div>
                    <p className="font-display font-bold text-2xl text-slate-900 leading-none">22:45</p>
                    <p className="font-mono font-bold text-sm text-sky-400 mt-0.5">LHR</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-ink-700">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 rounded-full px-2 py-0.5 font-mono">
                      <RefreshCw size={10} /> Scheduled
                    </span>
                    <span className="text-xs text-slate-600 font-mono">Ref: X7K2M9</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Hotel card mockup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
                      <span className="text-lg">🏨</span>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-slate-900">Hôtel Plaza Athénée</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm text-slate-600">Paris, France</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="font-display font-bold text-slate-900">5</span>
                      <span className="text-sm text-slate-600">nights</span>
                    </div>
                    <p className="text-sm text-slate-600 font-mono mt-0.5">EUR 3,200</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-ink-700/50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Check-in</span>
                    </div>
                    <p className="font-mono text-sm font-medium text-slate-800">Jun 12</p>
                  </div>
                  <div className="bg-ink-700/50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Check-out</span>
                    </div>
                    <p className="font-mono text-sm font-medium text-slate-800">Jun 17</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-ink-700">
                  <span className="text-sm text-slate-600">Deluxe Suite · Ref: HB-482</span>
                </div>
              </div>
            </motion.div>

            {/* Car rental mockup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center shrink-0">
                      <span className="text-lg">🚗</span>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-slate-900">Sixt Rent a Car</p>
                      <p className="text-sm text-slate-600 mt-0.5">BMW 3 Series · Automatic</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-slate-900">7</span>
                    <span className="text-sm text-slate-600 ml-1">days</span>
                    <p className="text-sm text-slate-600 font-mono mt-0.5">EUR 840</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-ink-700/50 rounded-xl p-3">
                    <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Pick-up</span>
                    <p className="font-mono text-sm font-medium text-slate-800 mt-1">Jun 12</p>
                    <p className="text-xs text-slate-600 mt-0.5">CDG Airport, Terminal 2</p>
                  </div>
                  <div className="bg-ink-700/50 rounded-xl p-3">
                    <span className="text-xs text-slate-600 uppercase tracking-wider font-display">Drop-off</span>
                    <p className="font-mono text-sm font-medium text-slate-800 mt-1">Jun 19</p>
                    <p className="text-xs text-slate-600 mt-0.5">Gare de Lyon</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-ink-700">
                  <span className="text-sm text-slate-600 font-mono">Ref: SI-7723-AA</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───── Share Feature ───── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="flex-1"
          >
            <div className="inline-flex items-center gap-2 bg-sky-400/10 border border-sky-400/20 rounded-full px-4 py-1.5 mb-4">
              <Share2 size={12} className="text-sky-400" />
              <span className="text-xs font-mono text-sky-400">Public sharing</span>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 leading-tight">
              Share your itinerary<br />
              <span className="text-sky-400">with anyone</span>
            </h2>
            <p className="mt-4 text-slate-500 leading-relaxed max-w-sm">
              Make any trip public and get a shareable link. Friends and family can view
              all your flights, hotels, and car rentals — no account needed.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Read-only view for privacy',
                'Works on any device',
                'No sign-up required to view',
              ].map((text) => (
                <li key={text} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check size={14} className="text-sky-400 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="flex-1 w-full max-w-sm"
          >
            <div className="relative bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
              <div className="border-b border-ink-700/60 bg-ink-950/60 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🗼</span>
                  <div>
                    <p className="font-display font-semibold text-slate-900 text-xs">Summer Europe 2026</p>
                    <div className="flex items-center gap-1">
                      <Globe size={10} className="text-sky-400" />
                      <span className="text-[10px] text-slate-600">Public itinerary</span>
                    </div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded bg-ink-700 border border-ink-600 flex items-center justify-center">
                  <span className="text-[9px] text-slate-500">TC</span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-ink-700/50 rounded-lg px-3 py-2 font-mono">
                  <Globe size={11} className="text-sky-400" />
                  tripcase.app/share/abc123…
                </div>
                <div className="bg-ink-700/50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Plane size={12} className="text-amber-400" />
                    <span className="text-xs text-slate-600 font-mono">AA100 · JFK → LHR</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Hotel size={12} className="text-emerald-400" />
                    <span className="text-xs text-slate-600 font-mono">Plaza Athénée · 5 nights</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Car size={12} className="text-sky-400" />
                    <span className="text-xs text-slate-600 font-mono">Sixt · BMW 3 Series · 7 days</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="relative border-t border-ink-700/60 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

        <section className="relative z-10 max-w-2xl mx-auto px-4 py-24 text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900">
            Ready to simplify your travels?
          </h2>
          <p className="mt-3 text-slate-500 max-w-sm mx-auto">
            Join TripCase and keep all your travel plans in one beautifully organized place.
          </p>
          <Link to="/signup" className="inline-block mt-8">
            <Button variant="primary" size="lg" className="gap-2 text-base px-8 py-3.5">
              Get started free <ArrowRight size={18} />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-slate-500 font-mono">No credit card required · Free forever</p>
        </section>

        {/* Footer */}
        <div className="relative z-10 border-t border-ink-700/60">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/30">
                <Plane size={11} className="text-ink-950 -rotate-45" />
              </div>
              <span className="font-display font-semibold text-sm text-slate-700">TripCase</span>
            </div>
            <p className="text-xs text-slate-600 font-mono">
              Travel smarter. &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
