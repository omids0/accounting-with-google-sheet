import {
  canShowNudge,
  nudgeShownOn,
  withNudgeNever,
  withNudgeShown,
  type NudgeState
} from './nudgeGate'
import { getOnboardingState } from './onboarding'
import { getItem, setItem } from './storage'
import { getJalaliMonthKey } from '../utils/dateRange'
import { toIsoDate } from '../utils/jalaliDate'

export const NUDGES_STORAGE_KEY = 'accounting_nudges_v1'

type StoredNudges = NudgeState & { noAccountStreak?: number }

type NudgeStore = Record<string, StoredNudges>

function readState(spreadsheetId: string): StoredNudges {
  return (getItem<NudgeStore>(NUDGES_STORAGE_KEY) ?? {})[spreadsheetId] ?? { signals: {} }
}

function writeState(spreadsheetId: string, state: StoredNudges): void {
  setItem(NUDGES_STORAGE_KEY, {
    ...getItem<NudgeStore>(NUDGES_STORAGE_KEY),
    [spreadsheetId]: state
  })
}

/** A finished onboarding dates the first use; otherwise the first save after this ships does. */
function firstUseDay(spreadsheetId: string, today: string): string {
  const closedAt = getOnboardingState(spreadsheetId)?.closedAt
  const closedDay = closedAt ? toIsoDate(new Date(closedAt)) : today

  return closedDay < today ? closedDay : today
}

/** Runs the gate for one signal and, when it passes, records it as shown. */
export function claimNudge(
  spreadsheetId: string,
  signalId: string,
  targetHasData: boolean,
  now = new Date()
): boolean {
  const today = toIsoDate(now)
  let state = readState(spreadsheetId)

  if (!state.firstDay) {
    state = { ...state, firstDay: firstUseDay(spreadsheetId, today) }
    writeState(spreadsheetId, state)
  }

  const period = getJalaliMonthKey(today)

  if (!canShowNudge(state, signalId, { today, period, targetHasData })) return false

  writeState(spreadsheetId, withNudgeShown(state, signalId, today, period))

  return true
}

export function neverAskNudge(spreadsheetId: string, signalId: string): void {
  writeState(spreadsheetId, withNudgeNever(readState(spreadsheetId), signalId))
}

/** The generic «می‌دانستی؟» row stays away on a day a contextual suggestion appeared. */
export function wasNudgeShownToday(spreadsheetId: string, now = new Date()): boolean {
  return nudgeShownOn(readState(spreadsheetId), toIsoDate(now))
}

/** Income/expense saves in a row without a wallet account; returns the new count. */
export function trackNoAccountStreak(spreadsheetId: string, hasAccount: boolean): number {
  const state = readState(spreadsheetId)
  const streak = hasAccount ? 0 : (state.noAccountStreak ?? 0) + 1

  writeState(spreadsheetId, { ...state, noAccountStreak: streak })

  return streak
}

const handoffs = new Map<string, unknown>()

/** Passes a positive answer's payload to the page that finishes the job. */
export function setNudgeHandoff(signalId: string, payload: unknown): void {
  handoffs.set(signalId, payload)
}

export function peekNudgeHandoff<T>(signalId: string): T | null {
  return (handoffs.get(signalId) as T | undefined) ?? null
}

export function clearNudgeHandoff(signalId: string): void {
  handoffs.delete(signalId)
}
