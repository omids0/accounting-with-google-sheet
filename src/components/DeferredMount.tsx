import { useEffect, useState, type ReactNode } from 'react'

interface DeferredMountProps {
  children: ReactNode
  fallback?: ReactNode
  idleTimeoutMs?: number
}

export default function DeferredMount({
  children,
  fallback = null,
  idleTimeoutMs = 1_200
}: DeferredMountProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const activate = () => setReady(true)

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(activate, { timeout: idleTimeoutMs })

      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(activate, 32)

    return () => window.clearTimeout(timeoutId)
  }, [idleTimeoutMs])

  if (!ready) return fallback

  return children
}
