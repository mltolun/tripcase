import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'Acceptance of Terms',
    content: 'By accessing or using TripCase, you agree to be bound by these terms. If you do not agree, do not use the service.',
  },
  {
    title: 'Description of Service',
    content: 'TripCase provides a web-based travel itinerary management tool that allows users to organise trips, flights, hotels, and car rentals. The service is provided "as is" without any warranties.',
  },
  {
    title: 'Account Registration',
    content: 'You must provide a valid email address and create a password to use the service. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.',
  },
  {
    title: 'User Data',
    content: 'You retain all ownership of the travel data you enter into TripCase. By using the service, you grant us the limited right to store and process this data solely for the purpose of providing the service to you.',
  },
  {
    title: 'Public Sharing',
    content: 'TripCase offers an optional public sharing feature. If you mark a trip as public and share the link, anyone with that link can view your trip details. You assume all responsibility for information you choose to share publicly.',
  },
  {
    title: 'Acceptable Use',
    content: 'You agree not to use TripCase for any unlawful purpose or in violation of any applicable laws. You may not attempt to access other users\' data or disrupt the service.',
  },
  {
    title: 'Limitation of Liability',
    content: 'TripCase is provided for personal organisational purposes. We are not responsible for any loss of data, missed flights, booking errors, or any other damages arising from the use of this service. Always verify your travel details with your airline or provider directly.',
  },
  {
    title: 'Third-Party Services',
    content: 'TripCase integrates with third-party services (including Supabase, FlightView, FlightStats, and Wikipedia) to provide features. We are not responsible for the availability or accuracy of these third-party services.',
  },
  {
    title: 'Termination',
    content: 'You may delete your account and all associated data at any time from your settings page. We may suspend or terminate access to the service for violations of these terms.',
  },
]

export function TermsPage() {
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
            <FileText size={22} className="text-ink-950" />
          </div>
          <h1 className="font-display font-bold text-3xl text-slate-900">Terms of Service</h1>
          <p className="text-sm text-slate-500 mt-2">Last updated: June 26, 2026</p>
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-2xl p-8 shadow-xl shadow-black/10 space-y-6">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="font-display font-semibold text-lg text-slate-900 mb-2">{section.title}</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{section.content}</p>
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
