import { useEffect, useState } from 'react'

import { loadGoogleIdentityScript } from '../services/googleIdentityScript'

/**
 * True once Google's web sign-in script is ready; it is fetched only while `load` is true.
 * Changing `retryKey` tries the download again after a failure.
 */
export function useGoogleIdentityScript(load: boolean, retryKey = 0): boolean {
  const [ready, setReady] = useState(() => !!window.google?.accounts?.oauth2)

  useEffect(() => {
    if (!load || ready) return

    let live = true

    void loadGoogleIdentityScript().then(ok => {
      if (live && ok) setReady(true)
    })

    return () => {
      live = false
    }
  }, [load, ready, retryKey])

  return ready
}
