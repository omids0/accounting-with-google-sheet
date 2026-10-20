import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canGoBack,
  goNextStep,
  goPreviousStep,
  initialJourneyState,
  isJourneyUnfinished,
  JOURNEY_ROW,
  JOURNEY_STEPS,
  OPTIONAL_STEPS,
  parseJourneyState,
  readJourney,
  stepNumber,
  type JourneyState,
  type JourneyStepKey
} from './buildingJourney'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'

const rows = vi.hoisted(() => ({ period: [] as string[][] }))

vi.mock('./spreadsheetStore', () => ({
  getSheetDataRows: (_id: string, sheet: string) =>
    sheet === PERIOD_SETTINGS_SHEET ? rows.period : null
}))

const walk = (state: JourneyState, how: 'done' | 'skipped'): JourneyStepKey[] => {
  const visited: JourneyStepKey[] = []

  for (let guard = 0; guard < 20 && !state.finished; guard += 1) {
    visited.push(state.step)
    state = goNextStep(state, how)
  }

  return visited
}

describe('journey order', () => {
  it('has the eight steps in the spec order', () => {
    expect(JOURNEY_STEPS.map(step => step.key)).toEqual([
      'profile',
      'fund',
      'units',
      'people',
      'debts',
      'issue',
      'invite',
      'summary'
    ])
    expect(stepNumber('summary')).toBe(8)
  })

  it('starts a created building at the units step with the first two behind it', () => {
    expect(initialJourneyState({ unitCount: 12 })).toEqual({
      step: 'units',
      done: ['profile', 'fund'],
      skipped: [],
      finished: false,
      unitCount: 12
    })
  })

  it('saving walks the steps in order and finishes after the summary', () => {
    expect(walk(initialJourneyState(), 'done')).toEqual([
      'units',
      'people',
      'debts',
      'issue',
      'invite',
      'summary'
    ])
  })

  it('records done and skipped steps apart', () => {
    let state = initialJourneyState()

    state = goNextStep(state, 'done')
    state = goNextStep(state, 'skipped')

    expect(state.step).toBe('debts')
    expect(state.done).toEqual(['profile', 'fund', 'units'])
    expect(state.skipped).toEqual(['people'])
  })

  it('saving a step that was skipped before clears the skip', () => {
    const back = { ...initialJourneyState(), step: 'people' as const, skipped: ['people' as const] }

    const next = goNextStep(back, 'done')

    expect(next.skipped).toEqual([])
    expect(next.done).toContain('people')
  })

  it('finishes only after the summary and keeps the step', () => {
    const last: JourneyState = { ...initialJourneyState(), step: 'summary' }

    const finished = goNextStep(last)

    expect(finished.finished).toBe(true)
    expect(finished.step).toBe('summary')
    expect(isJourneyUnfinished(finished)).toBe(false)
  })

  it('only the optional steps may be skipped', () => {
    expect(OPTIONAL_STEPS).not.toContain('profile')
    expect(OPTIONAL_STEPS).not.toContain('fund')
    expect(OPTIONAL_STEPS).not.toContain('summary')
  })
})

describe('going back', () => {
  const at = (step: JourneyStepKey): JourneyState => ({ ...initialJourneyState(), step })

  it('is offered from step 5 on', () => {
    expect(canGoBack(at('people'))).toBe(false)
    expect(canGoBack(at('debts'))).toBe(true)
    expect(canGoBack(at('summary'))).toBe(true)
  })

  it('moves one step back and keeps the marks', () => {
    const state = {
      ...at('issue'),
      done: ['profile', 'fund', 'units', 'debts'] as JourneyStepKey[]
    }

    const back = goPreviousStep(state)

    expect(back.step).toBe('debts')
    expect(back.done).toEqual(state.done)
  })

  it('stays put where back is not offered', () => {
    const state = at('people')

    expect(goPreviousStep(state)).toBe(state)
  })
})

describe('persisted state', () => {
  beforeEach(() => {
    rows.period = []
  })

  it('round-trips through the JSON of the row', () => {
    const state = goNextStep(initialJourneyState({ unitCount: 8, note: 'یادداشت' }), 'skipped')

    expect(parseJourneyState(JSON.stringify(state))).toEqual(state)
  })

  it('rejects garbage and unknown steps', () => {
    expect(parseJourneyState('not json')).toBeNull()
    expect(parseJourneyState('{"step":"nope"}')).toBeNull()
  })

  it('reads the «راه‌اندازی» row of «تنظیمات دوره»', () => {
    rows.period = [
      ['تاریخ عضویت', '1405/01/01', 't'],
      [JOURNEY_ROW, JSON.stringify(initialJourneyState()), 't']
    ]

    expect(readJourney('b1')?.step).toBe('units')
  })

  it('reads a building without the row as having nothing left to set up', () => {
    rows.period = [['نوع فضا', 'ساختمان', 't']]

    expect(readJourney('b1')).toBeNull()
    expect(isJourneyUnfinished(null)).toBe(false)
  })
})
