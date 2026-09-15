import { useCallback, useEffect, useRef } from 'react'
import { registerSW } from 'virtual:pwa-register'

import { useAppStore } from '../stores/appStore'
import { syncPendingAppUpdate } from '../utils/appUpdateStatus'

export function useAppUpdate(locked: boolean) {
  const setUpdateAvailable = useAppStore(state => state.setUpdateAvailable)
  const dismissUpdatePrompt = useAppStore(state => state.dismissUpdatePrompt)
  const resetUpdatePrompt = useAppStore(state => state.resetUpdatePrompt)
  const setUpdateApplying = useAppStore(state => state.setUpdateApplying)
  const registerAppUpdateApply = useAppStore(state => state.registerAppUpdateApply)
  const updateAvailable = useAppStore(state => state.updateAvailable)
  const updatePromptDismissed = useAppStore(state => state.updatePromptDismissed)
  const applying = useAppStore(state => state.updateApplying)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>()

  const markUpdateAvailable = useCallback(() => {
    setUpdateAvailable(true)
  }, [setUpdateAvailable])

  const applyUpdate = useCallback(() => {
    setUpdateApplying(true)
    void updateSWRef.current?.(true)
  }, [setUpdateApplying])

  useEffect(() => {
    registerAppUpdateApply(applyUpdate)
  }, [applyUpdate, registerAppUpdateApply])

  useEffect(() => {
    updateSWRef.current = registerSW({
      onNeedRefresh() {
        markUpdateAvailable()
      }
    })

    void syncPendingAppUpdate(markUpdateAvailable)
  }, [markUpdateAvailable])

  useEffect(() => {
    if (locked) {
      resetUpdatePrompt()
      void syncPendingAppUpdate(markUpdateAvailable)
    }
  }, [locked, markUpdateAvailable, resetUpdatePrompt])

  useEffect(() => {
    if (locked) return

    void syncPendingAppUpdate(markUpdateAvailable)
  }, [locked, markUpdateAvailable])

  return {
    showPrompt: updateAvailable && !updatePromptDismissed,
    showHeaderAction: updateAvailable && updatePromptDismissed && !locked,
    applying,
    applyUpdate,
    dismissUpdate: dismissUpdatePrompt
  }
}
