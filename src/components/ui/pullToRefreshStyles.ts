import type { PullPhase } from '../../hooks/usePullToRefresh'
import { cn } from '../../utils/cn'

/** Height of the row while the page reloads. */
export const PULL_REFRESHING_HEIGHT = 48

/** Follows the finger while dragging; eases open/closed otherwise (not with reduced motion). */
export function pullRowClass(phase: PullPhase) {
  return cn(
    'flex flex-col items-center justify-end gap-1 overflow-hidden text-[0.7rem] text-muted',
    (phase === 'idle' || phase === 'refreshing') &&
      'motion-safe:transition-[height] motion-safe:duration-(--duration-normal) motion-safe:ease-out'
  )
}

export function pullSpinnerClass(phase: PullPhase) {
  return cn(
    'block size-[22px] flex-none rounded-full border-2 border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] border-t-primary',
    phase === 'ready' && 'border-primary border-t-transparent',
    phase === 'refreshing'
      ? 'motion-safe:animate-[spin_0.7s_linear_infinite]'
      : 'motion-safe:rotate-(--pull-turn)'
  )
}

export const pullLabelClass = 'pb-1.5 leading-4'
