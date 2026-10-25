import { useEffect, useState } from 'react'

import { showBusy, updateBusy } from '../stores/busyOverlayStore'

/** One wait of a long create: what the busy overlay says, and how far its bar may creep. */
export interface BusyStep {
  label: string
  ceiling: number
}

/**
 * The busy overlay of a long create (a building, the shared account): its text follows the step
 * and its bar creeps toward the step's ceiling until Google answers. `active` is true from
 * `start` until `stop`.
 */
export function useCreepingBusy<K extends string>(steps: Record<K, BusyStep>, first: K) {
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<K>(first)

  useEffect(() => {
    if (!active) return

    const { ceiling } = steps[step]

    const timer = window.setInterval(
      () => setProgress(value => value + (ceiling - value) * 0.12),
      350
    )

    return () => window.clearInterval(timer)
  }, [active, step, steps])

  // The overlay (not the page) shows the wait: its text and bar follow the step and the creep.
  useEffect(() => {
    if (active) updateBusy({ message: steps[step].label, progress })
  }, [active, step, progress, steps])

  return {
    active,
    start: (next: K, from = 4) => {
      setActive(true)
      setStep(next)
      setProgress(from)
      showBusy(steps[next].label, from)
    },
    /** The next wait; the bar never goes back below `floor`. */
    advance: (next: K, floor: number) => {
      setStep(next)
      setProgress(value => Math.max(value, floor))
    },
    complete: () => setProgress(100),
    stop: () => setActive(false)
  }
}
