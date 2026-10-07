import { App } from '@capacitor/app'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { getPathForTab } from '../routes/paths'
import { isBankSmsAvailable, setBankSmsCaptureEnabled } from '../services/bankSmsNative'
import { getBankSmsPrefs } from '../services/bankSmsPrefs'
import { useBankSmsStore } from '../stores/bankSmsStore'

/** Matches the URL the native notification opens (BankSmsNotifier.OPEN_URL). */
const OPEN_URL_MARKER = '://bank-sms'

/**
 * Android only: refresh the bank SMS queue on start and on every resume, and
 * open the review page when the user taps the native notification.
 */
export function useBankSmsSync(): void {
  const navigate = useNavigate()
  const refresh = useBankSmsStore(state => state.refresh)

  useEffect(() => {
    if (!isBankSmsAvailable()) return

    const openIfBankSms = (url: string | undefined) => {
      if (url?.includes(OPEN_URL_MARKER)) navigate(getPathForTab('bank-sms'))
    }

    // Re-sync the native switch (e.g. after an update) before reading the queue.
    void setBankSmsCaptureEnabled(getBankSmsPrefs().enabled)
      .catch(() => {})
      .then(() => refresh())
    void App.getLaunchUrl()
      .then(launch => openIfBankSms(launch?.url))
      .catch(() => {})

    const resume = App.addListener('resume', () => void refresh())
    const urlOpen = App.addListener('appUrlOpen', event => openIfBankSms(event.url))

    return () => {
      void resume.then(handle => handle.remove())
      void urlOpen.then(handle => handle.remove())
    }
  }, [navigate, refresh])
}
