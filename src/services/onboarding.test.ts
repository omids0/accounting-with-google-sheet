import { beforeEach, describe, expect, it, vi } from 'vitest'

const sheets: Record<string, string[][] | null> = {}

vi.mock('./spreadsheetStore', () => ({
  getSheetDataRows: (_id: string, name: string) => sheets[name] ?? null
}))
vi.mock('./settings', () => ({
  getSettings: () => ({
    forms: [
      { id: 'i', sheetName: 'درآمد', type: 'income' },
      { id: 'e', sheetName: 'هزینه', type: 'expense' }
    ]
  })
}))
vi.mock('./wallet', () => ({ WALLET_SHEET: 'کیف پول' }))

const onboarding = await import('./onboarding')

const ID = 'sheet-1'
const ALL = onboarding.getOnboardingSteps(true)
const WEB = onboarding.getOnboardingSteps(false)

function setSheets(next: Record<string, string[][] | null>) {
  for (const key of Object.keys(sheets)) delete sheets[key]
  Object.assign(sheets, next)
}

describe('onboarding', () => {
  beforeEach(() => {
    localStorage.clear()
    setSheets({ 'کیف پول': [], درآمد: [], هزینه: [] })
  })

  it('lists the SMS step only when available', () => {
    expect(ALL).toEqual(['wallet', 'accounts', 'entry', 'sms'])
    expect(WEB).toEqual(['wallet', 'accounts', 'entry'])
  })

  it('treats an uncached tab as unknown, not empty', () => {
    setSheets({ 'کیف پول': [], درآمد: null, هزینه: [] })
    expect(onboarding.isSpreadsheetEmpty(ID)).toBeNull()
    expect(onboarding.shouldStartOnboarding(ID)).toBe(false)
  })

  it('starts only for an empty sheet with no saved state', () => {
    expect(onboarding.shouldStartOnboarding(ID)).toBe(true)
    onboarding.startOnboarding(ID)
    expect(onboarding.shouldStartOnboarding(ID)).toBe(false)
  })

  it('does not start when an account or a record exists', () => {
    setSheets({ 'کیف پول': [['ملت', '100']], درآمد: [], هزینه: [] })
    expect(onboarding.shouldStartOnboarding(ID)).toBe(false)
    setSheets({ 'کیف پول': [], درآمد: [], هزینه: [['x', '5']] })
    expect(onboarding.shouldStartOnboarding(ID)).toBe(false)
  })

  it('skipping the first account also skips extra accounts', () => {
    onboarding.startOnboarding(ID)
    onboarding.resolveOnboardingStep(ID, 'wallet', 'skipped')

    const state = onboarding.getOnboardingState(ID)!

    expect(state.steps).toEqual({ wallet: 'skipped', accounts: 'skipped' })
    expect(onboarding.firstPendingStep(state, ALL)).toBe('entry')
  })

  it('needs a resume card only when paused with steps left', () => {
    onboarding.startOnboarding(ID)
    onboarding.resolveOnboardingStep(ID, 'wallet', 'done')
    expect(onboarding.needsOnboardingResume(onboarding.getOnboardingState(ID), WEB)).toBe(false)

    onboarding.pauseOnboarding(ID)

    const paused = onboarding.getOnboardingState(ID)!

    expect(onboarding.needsOnboardingResume(paused, WEB)).toBe(true)
    expect(onboarding.remainingStepCount(paused, WEB)).toBe(2)
    expect(paused.closedAt).toBeTypeOf('number')
    expect(onboarding.isOnboardingClosed(paused, WEB)).toBe(false)

    onboarding.resolveOnboardingStep(ID, 'accounts', 'done')
    onboarding.resolveOnboardingStep(ID, 'entry', 'skipped')
    expect(onboarding.isOnboardingClosed(onboarding.getOnboardingState(ID), WEB)).toBe(true)
  })

  it('notifies subscribers on change', () => {
    const listener = vi.fn()
    const unsubscribe = onboarding.subscribeOnboarding(listener)

    onboarding.startOnboarding(ID)
    onboarding.finishOnboarding(ID)
    unsubscribe()
    onboarding.resumeOnboarding(ID)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(onboarding.getOnboardingState(ID)?.status).toBe('active')
  })

  it('keeps state per spreadsheet', () => {
    onboarding.startOnboarding(ID)
    expect(onboarding.getOnboardingState('other')).toBeNull()
  })
})
