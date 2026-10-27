import { getSettings } from './settings'
import { WALLET_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import { countSheetDataRows, rowHasContent } from './spreadsheetStoreCount'
import { getItem, setItem } from './storage'
import { isPersonalWorkspace } from './workspace'

export const ONBOARDING_STORAGE_KEY = 'accounting_onboarding_v1'

export type OnboardingStepId = 'wallet' | 'accounts' | 'entry' | 'sms'

export type OnboardingStepStatus = 'done' | 'skipped'

/** `active`: the wizard is on screen; `paused`: left for later; `finished`: closed for good. */
export type OnboardingStatus = 'active' | 'paused' | 'finished'

export interface OnboardingState {
  status: OnboardingStatus
  steps: Partial<Record<OnboardingStepId, OnboardingStepStatus>>
  /** When the wizard was last left (paused or finished); starts the discovery grace period. */
  closedAt?: number
}

type OnboardingStore = Record<string, OnboardingState>

const listeners = new Set<() => void>()

export function subscribeOnboarding(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getOnboardingState(spreadsheetId: string): OnboardingState | null {
  return (getItem<OnboardingStore>(ONBOARDING_STORAGE_KEY) ?? {})[spreadsheetId] ?? null
}

function saveOnboardingState(spreadsheetId: string, state: OnboardingState): void {
  const store = getItem<OnboardingStore>(ONBOARDING_STORAGE_KEY) ?? {}

  setItem(ONBOARDING_STORAGE_KEY, { ...store, [spreadsheetId]: state })
  listeners.forEach(listener => listener())
}

export function getOnboardingSteps(includeSms: boolean): OnboardingStepId[] {
  return includeSms ? ['wallet', 'accounts', 'entry', 'sms'] : ['wallet', 'accounts', 'entry']
}

function hasDataRows(rows: string[][] | null): boolean | null {
  if (rows === null) return null

  return rows.some(row => row.some(cell => String(cell ?? '').trim()))
}

export function countWalletAccounts(spreadsheetId: string): number | null {
  const rows = getSheetDataRows(spreadsheetId, WALLET_SHEET)

  return rows === null ? null : rows.filter(row => String(row[0] ?? '').trim()).length
}

/**
 * Income/expense rows across every form; null while a form's tab is not cached yet. Callers that
 * only compare with a threshold pass it as `stopAt`: counting then stops there (the result is the
 * count capped at `stopAt`) instead of walking every row of every tab on each render.
 */
export function countRecordRows(spreadsheetId: string, stopAt = Infinity): number | null {
  let total = 0

  for (const form of getSettings()?.forms ?? []) {
    // A tab that is not cached makes the answer unknown even when the threshold is already met.
    const rows = countSheetDataRows(
      spreadsheetId,
      form.sheetName,
      rowHasContent,
      Math.max(0, stopAt - total)
    )

    if (rows === null) return null
    total += rows
  }

  return total
}

/** True only when the cached mirror proves there are no accounts and no records. */
export function isSpreadsheetEmpty(spreadsheetId: string): boolean | null {
  const wallet = hasDataRows(getSheetDataRows(spreadsheetId, WALLET_SHEET))
  const records = countRecordRows(spreadsheetId, 1)

  if (wallet === null || records === null) return null

  return !wallet && records === 0
}

export function shouldStartOnboarding(spreadsheetId: string): boolean {
  // A building has its own setup journey and a shared account its own creation flow: the
  // personal wizard runs in neither.
  if (!isPersonalWorkspace(spreadsheetId)) return false

  return getOnboardingState(spreadsheetId) === null && isSpreadsheetEmpty(spreadsheetId) === true
}

export function startOnboarding(spreadsheetId: string): void {
  saveOnboardingState(spreadsheetId, { status: 'active', steps: {} })
}

export function resolveOnboardingStep(
  spreadsheetId: string,
  step: OnboardingStepId,
  status: OnboardingStepStatus
): void {
  const state = getOnboardingState(spreadsheetId) ?? { status: 'active', steps: {} }
  const steps = { ...state.steps, [step]: status }

  // Extra accounts make no sense once the first account was skipped.
  if (step === 'wallet' && status === 'skipped') steps.accounts = 'skipped'
  saveOnboardingState(spreadsheetId, { ...state, steps })
}

function setStatus(spreadsheetId: string, status: OnboardingStatus): void {
  const state = getOnboardingState(spreadsheetId) ?? { status, steps: {} }

  saveOnboardingState(spreadsheetId, {
    ...state,
    status,
    closedAt: status === 'active' ? state.closedAt : Date.now()
  })
}

export const pauseOnboarding = (spreadsheetId: string) => setStatus(spreadsheetId, 'paused')

export const resumeOnboarding = (spreadsheetId: string) => setStatus(spreadsheetId, 'active')

export const finishOnboarding = (spreadsheetId: string) => setStatus(spreadsheetId, 'finished')

export function firstPendingStep(
  state: OnboardingState,
  steps: OnboardingStepId[]
): OnboardingStepId | null {
  return steps.find(step => !state.steps[step]) ?? null
}

export function remainingStepCount(state: OnboardingState, steps: OnboardingStepId[]): number {
  return steps.filter(step => !state.steps[step]).length
}

/** The resume card shows only for a wizard left half-way. */
export function needsOnboardingResume(state: OnboardingState | null, steps: OnboardingStepId[]) {
  return state?.status === 'paused' && remainingStepCount(state, steps) > 0
}

/** Onboarding no longer competes for the dashboard: never started, finished or fully resolved. */
export function isOnboardingClosed(state: OnboardingState | null, steps: OnboardingStepId[]) {
  if (!state) return true
  if (state.status === 'active') return false

  return !needsOnboardingResume(state, steps)
}
