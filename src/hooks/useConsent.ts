import { useState, useEffect, useCallback } from 'react'

const CONSENT_KEY = 'tripcase-consent'

export function useConsent() {
  const [consented, setConsented] = useState(true)

  useEffect(() => {
    setConsented(localStorage.getItem(CONSENT_KEY) === 'true')
  }, [])

  const giveConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'true')
    setConsented(true)
  }, [])

  return { consented, giveConsent }
}
