import { useEffect, useRef } from 'react'

import { isTokenValid } from '../services/auth'
import { getSettings } from '../services/settings'

const TOKEN_WAIT_MS = 60_000

const TOKEN_POLL_MS = 1_000

async function waitForValidToken(): Promise<boolean> {
  const deadline = Date.now() + TOKEN_WAIT_MS

  while (!isTokenValid()) {
    if (Date.now() > deadline) return false
    await new Promise(resolve => setTimeout(resolve, TOKEN_POLL_MS))
  }

  return true
}

export function useEngagementReminders(): void {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    void (async () => {
      try {
        // Cached data now shows before the token is renewed; wait for it.
        if (!(await waitForValidToken())) return
        // Loaded on demand so reminder and push code stays out of the main chunk.
        // Monthly recurring items in «خودکار» mode post on app open (round 6, Task A2),
        // independently of reminder setup (which can wait on the service worker).
        await Promise.all([
          import('../services/engagementStartup').then(m => m.runEngagementStartup(spreadsheetId)),
          import('../components/recurring/recurringAutoPost').then(m =>
            m.runRecurringAutoPost(spreadsheetId)
          )
        ])
      } catch {
        /* non-blocking background setup */
      }
    })()
  }, [])
}
