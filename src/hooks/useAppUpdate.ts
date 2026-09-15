import { useCallback, useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [applying, setApplying] = useState(false)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>()

  useEffect(() => {
    updateSWRef.current = registerSW({
      onNeedRefresh() {
        setUpdateAvailable(true)
      }
    })
  }, [])

  const applyUpdate = useCallback(() => {
    setApplying(true)
    void updateSWRef.current?.(true)
  }, [])

  const dismissUpdate = useCallback(() => {
    setDismissed(true)
  }, [])

  return {
    showPrompt: updateAvailable && !dismissed,
    applying,
    applyUpdate,
    dismissUpdate
  }
}
