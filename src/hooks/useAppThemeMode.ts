import { useEffect, useState } from 'react'

export type AppThemeMode = 'light' | 'dark'

function readAppThemeMode(): AppThemeMode {
  if (typeof document === 'undefined') return 'light'

  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function useAppThemeMode(): AppThemeMode {
  const [mode, setMode] = useState<AppThemeMode>(readAppThemeMode)

  useEffect(() => {
    const refresh = () => setMode(readAppThemeMode())

    const observer = new MutationObserver(refresh)

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    return () => observer.disconnect()
  }, [])

  return mode
}
