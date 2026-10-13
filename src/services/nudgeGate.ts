/**
 * The rules every contextual suggestion obeys, as pure functions so other rounds can
 * reuse them with their own signals: never while the target already has data, never on
 * the user's first day, at most one suggestion a day, each signal once per period, and
 * «دیگر نپرس» for good.
 */

export interface NudgeEntry {
  /** Period (Jalali `YYYY-MM`) the signal was last shown in. */
  shownPeriod?: string
  /** ISO day it was last shown; drives the one-a-day cap. */
  shownDay?: string
  never?: boolean
}

export interface NudgeState {
  /** ISO day this spreadsheet was first used with suggestions on. */
  firstDay?: string
  signals: Record<string, NudgeEntry>
}

export interface NudgeGateContext {
  today: string
  period: string
  targetHasData: boolean
}

export function nudgeShownOn(state: NudgeState, day: string): boolean {
  return Object.values(state.signals).some(entry => entry.shownDay === day)
}

export function canShowNudge(state: NudgeState, signalId: string, ctx: NudgeGateContext): boolean {
  if (ctx.targetHasData) return false
  if (!state.firstDay || state.firstDay >= ctx.today) return false
  if (nudgeShownOn(state, ctx.today)) return false

  const entry = state.signals[signalId]

  return !entry?.never && entry?.shownPeriod !== ctx.period
}

function withEntry(state: NudgeState, signalId: string, patch: NudgeEntry): NudgeState {
  return {
    ...state,
    signals: { ...state.signals, [signalId]: { ...state.signals[signalId], ...patch } }
  }
}

export function withNudgeShown(
  state: NudgeState,
  signalId: string,
  today: string,
  period: string
): NudgeState {
  return withEntry(state, signalId, { shownDay: today, shownPeriod: period })
}

export function withNudgeNever(state: NudgeState, signalId: string): NudgeState {
  return withEntry(state, signalId, { never: true })
}
