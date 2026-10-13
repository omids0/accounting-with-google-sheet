import { useEffect, useSyncExternalStore } from 'react'

import { getOverlayCount, subscribeOverlays } from './overlayStack'

/**
 * «Mid-task»: a modal, sheet or menu is open (the overlay registry from
 * `useModalLock`), or a form holds input that is not saved yet. Prompts that would
 * interrupt (the update banner, «چه خبر؟») wait until it is false.
 */
let unsavedForms = 0

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  const offOverlays = subscribeOverlays(listener)

  return () => {
    listeners.delete(listener)
    offOverlays()
  }
}

export function isUserBusy(): boolean {
  return getOverlayCount() > 0 || unsavedForms > 0
}

/** A form reports here while it holds unsaved input. */
export function useUnsavedWork(active: boolean): void {
  useEffect(() => {
    if (!active) return

    unsavedForms += 1
    notify()

    return () => {
      unsavedForms -= 1
      notify()
    }
  }, [active])
}

export function useUserBusy(): boolean {
  return useSyncExternalStore(subscribe, isUserBusy)
}
