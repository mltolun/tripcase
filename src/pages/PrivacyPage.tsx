import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'Information We Collect',
    content: (
      <ul className="space-y-2">
        <li><strong>Account information:</strong> Email address and password (stored securely by Supabase Auth) when you create an account.</li>
        <li><strong>Travel data:</strong> Trip names, descriptions, dates, flight details, hotel bookings, car rental information, and booking references that you enter into the service.</li>
        <li><strong>Local storage:</strong> Your authentication session is persisted in your browser's local storage to keep you signed in between visits.</li>
      </ul>
    ),
  },
  {
    title: 'How We Use Your Information',
    content: (
      <ul className="space-y-2">
        <li>To provide and maintain the TripCase service — storing and organising your travel itineraries.</li>
        <li>To enable public sharing of trips you choose to make public.</li>
        <li>To improve the service based on usage patterns.</li>
      </ul>
    ),
  },
  {
    title: 'Third-Party Services',
    content: (
      <>
        <p className="mb-3">TripCase uses the following third-party services. Each processes data strictly as described:</p>
        <ul className="space-y-2">
          <li><strong>Supabase</strong> — Database storage, authentication, and serverless functions. All user data is stored in Supabase's PostgreSQL database. Supabase is SOC 2 compliant. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">Privacy policy</a></li>
          <li><strong>FlightView API &amp; FlightStats</strong> — When you look up a flight by number, your flight number and airline code are sent to these services to retrieve flight details and status.</li>
          <li><strong>Wikipedia API</strong> — When you create a trip with a city name, the city name is sent to Wikipedia to fetch a cover photo.</li>
          <li><strong>Kiwi.com CDN</strong> — Airline logos are loaded from Kiwi.com's CDN using the airline IATA code.</li>
          <li><strong>Google Fonts</strong> — The Inter typeface is loaded from Google Fonts. This may transmit your IP address and user agent to Google. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">Privacy policy</a></li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cookies and Local Storage',
    content: (
      <p>TripCase does not use cookies. We use your browser's local storage solely to persist your authentication session. This is strictly necessary for the service to function and does not involve any tracking, analytics, or advertising.</p>
    ),
  },
  {
    title: 'Data Retention',
    content: (
      <p>We retain your account information and travel data for as long as your account remains active. You may delete your account and all associated data at any time from your settings page.</p>
    ),
  },
  {
    title: 'Your Rights',
    content: (
      <>
        <p className="mb-3">Under the GDPR and similar privacy laws, you have the right to:</p>
        <ul className="space-y-2">
          <li><strong>Access</strong> — Request a copy of your data.</li>
          <li><strong>Rectification</strong> — Correct inaccurate data.</li>
          <li><strong>Erasure</strong> — Delete your account and all associated data.</li>
          <li><strong>Data portability</strong> — Export your data in a machine-readable format.</li>
          <li><strong>Withdraw consent</strong> — Consent to local storage is implied by use. Clearing your browser data will reset this.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Data Security',
    content: (
      <p>All data is transmitted over HTTPS. Row-level security policies in Supabase ensure that users can only access their own data. No credit card or payment information is collected or stored.</p>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>If you have questions about this privacy policy or wish to exercise your data rights, please open an issue on our <a href="https://github.com/anomalyco/tripcase" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">GitHub repository</a>.</p>
    ),
  },
  {
    title: 'Changes to This Policy',
    content: (
      <p>We may update this privacy policy from time to time. Changes will be posted on this page and, where appropriate, notified via the service.</p>
    ),
  },
]

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-3xl mx-auto px-4 py-16"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400 shadow-lg shadow-amber-400/30 mb-4">
            <Shield size={22} className="text-ink-950" />
          </div>
          <h1 className="font-display font-bold text-3xl text-slate-900">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mt-2">Last updated: June 26, 2026</p>
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-2xl p-8 shadow-xl shadow-black/10 space-y-8">
          <p className="text-sm text-slate-500 leading-relaxed">
            TripCase ("we", "our", "the service") is a travel itinerary management tool. This privacy policy explains how we collect, use, and protect your personal data when you use our service.
          </p>

          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="font-display font-semibold text-lg text-slate-900 mb-3">{section.title}</h2>
              <div className="text-sm text-slate-500 leading-relaxed space-y-1">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          <Link to="/" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Back to TripCase
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
