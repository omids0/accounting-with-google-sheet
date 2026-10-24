import { useEffect, useState } from 'react'

/** A number that goes up every time the browser comes back online, to retry a failed download. */
export function useOnlineRetryKey(): number {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const bump = () => setKey(current => current + 1)

    window.addEventListener('online', bump)

    return () => window.removeEventListener('online', bump)
  }, [])

  return key
}
