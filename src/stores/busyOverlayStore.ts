import { create } from 'zustand'

import { showError } from '../utils/toast'

/** A switch that has not finished by now is given up on: the overlay goes and an error shows. */
export const BUSY_MAX_MS = 30_000

/**
 * After the switch, how long the overlay may wait for a page that does not report «ready» (a page
 * that does, and is still loading, holds it until it is ready or `BUSY_MAX_MS` runs out).
 */
export const BUSY_RELEASE_FALLBACK_MS = 1500

export const BUSY_TIMEOUT_MESSAGE =
  'این کار بیش از حد طول کشید؛ اتصال اینترنت را بررسی کن و دوباره امتحان کن.'

interface BusyOverlayState {
  /** What the overlay says; `null` = no overlay. */
  message: string | null
  /** 0..100 for the bar inside the overlay; `null` = no bar. */
  progress: number | null
  /** The switch is done and the overlay waits for the destination page to report it is ready. */
  awaitingPage: boolean
}

export const useBusyOverlayStore = create<BusyOverlayState>(() => ({
  message: null,
  progress: null,
  awaitingPage: false
}))

let maxTimer: ReturnType<typeof setTimeout> | null = null

let releaseTimer: ReturnType<typeof setTimeout> | null = null

/** Pages on screen that report «ready» and are not yet. */
let pendingPages = 0

function clearReleaseTimer() {
  if (releaseTimer) clearTimeout(releaseTimer)
  releaseTimer = null
}

function clearTimers() {
  if (maxTimer) clearTimeout(maxTimer)
  maxTimer = null
  clearReleaseTimer()
}

function armFallback(ms: number) {
  clearReleaseTimer()
  releaseTimer = setTimeout(() => {
    if (pendingPages === 0) hideBusy()
  }, ms)
}

/** Puts the overlay up (or changes its message when it is already up). */
export function showBusy(message: string, progress?: number): void {
  const { message: current, progress: currentProgress } = useBusyOverlayStore.getState()

  if (current === null) {
    clearTimers()
    maxTimer = setTimeout(() => {
      hideBusy()
      showError(BUSY_TIMEOUT_MESSAGE)
    }, BUSY_MAX_MS)
  }
  useBusyOverlayStore.setState({
    message,
    progress: progress ?? (current === null ? null : currentProgress),
    awaitingPage: false
  })
}

/** Changes the message or bar of an overlay that is up; does nothing while it is not. */
export function updateBusy(patch: { message?: string; progress?: number }): void {
  const { message } = useBusyOverlayStore.getState()

  if (message === null) return
  useBusyOverlayStore.setState({
    message: patch.message ?? message,
    ...(patch.progress === undefined ? {} : { progress: patch.progress })
  })
}

export function hideBusy(): void {
  clearTimers()
  useBusyOverlayStore.setState({ message: null, progress: null, awaitingPage: false })
}

/**
 * The switch itself is done. The overlay stays until the page that opened reports it is ready
 * (`useBusyOverlayRelease`) or, for a page that does not, `fallbackMs` after this call.
 */
export function releaseBusyWhenReady(fallbackMs: number = BUSY_RELEASE_FALLBACK_MS): void {
  if (useBusyOverlayStore.getState().message === null) return
  armFallback(fallbackMs)
  useBusyOverlayStore.setState({ awaitingPage: true })
}

/**
 * A page that reports «ready» calls this while it is not (`useBusyOverlayRelease`): the overlay
 * does not give up on it at the fallback. The returned function says it is ready or gone.
 */
export function trackPendingPage(): () => void {
  pendingPages += 1

  return () => {
    pendingPages -= 1
    if (pendingPages === 0 && useBusyOverlayStore.getState().awaitingPage) {
      armFallback(BUSY_RELEASE_FALLBACK_MS)
    }
  }
}

/** The actions as a hook-shaped bundle, so a component can take them like any other hook. */
export function useBusyOverlay() {
  return { show: showBusy, update: updateBusy, hide: hideBusy, release: releaseBusyWhenReady }
}
