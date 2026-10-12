import { useEffect, useState } from 'react'

import { loadGoogleIdentityScript } from '../services/googleIdentityScript'

/** True once Google's web sign-in script is ready; it is fetched only while `load` is true. */
export function useGoogleIdentityScript(load: boolean): boolean {
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
  }, [load, ready])

  return ready
}
