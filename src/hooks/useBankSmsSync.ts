import { App } from '@capacitor/app'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { getPathForTab } from '../routes/paths'
import { isBankSmsAvailable } from '../services/bankSmsNative'
import { syncBankSmsNativeSettings } from '../services/bankSmsViewRange'
import { useBankSmsStore } from '../stores/bankSmsStore'

/** URLs the native notifications open (BankSmsNotifier.OPEN_URL, NightlyDigest.ENTRY_URL). */
const OPEN_URL_MARKER = '://bank-sms'

const ENTRY_URL_MARKER = '://entry'

/** The launch URL stays the same for the whole session; follow it only once. */
let launchUrlHandled = false

/**
 * Android only: refresh the bank SMS queue on start and on every resume, and
 * open the review page when the user taps the native notification.
 */
export function useBankSmsSync(): void {
  const navigate = useNavigate()
  // useNavigate() changes identity on every route change; the effect must not re-run.
  const navigateRef = useRef(navigate)

  navigateRef.current = navigate

  useEffect(() => {
    if (!isBankSmsAvailable()) return

    const { refresh } = useBankSmsStore.getState()
    const openIfBankSms = (url: string | undefined) => {
      if (url?.includes(OPEN_URL_MARKER)) navigateRef.current(getPathForTab('bank-sms'))
      else if (url?.includes(ENTRY_URL_MARKER)) navigateRef.current(getPathForTab('entry'))
    }

    // Re-sync the native switch and range (e.g. after an update) before reading the queue.
    void syncBankSmsNativeSettings().then(() => refresh())

    if (!launchUrlHandled) {
      launchUrlHandled = true
      void App.getLaunchUrl()
        .then(launch => openIfBankSms(launch?.url))
        .catch(() => {})
    }

    const resume = App.addListener('resume', () => void refresh())
    const urlOpen = App.addListener('appUrlOpen', event => openIfBankSms(event.url))

    return () => {
      void resume.then(handle => handle.remove())
      void urlOpen.then(handle => handle.remove())
    }
  }, [])
}
