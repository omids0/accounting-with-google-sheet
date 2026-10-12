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
        const { runEngagementStartup } = await import('../services/engagementStartup')
        await runEngagementStartup(spreadsheetId)
      } catch {
        /* non-blocking background setup */
      }
    })()
  }, [])
}
