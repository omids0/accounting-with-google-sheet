import { beforeEach, describe, expect, it, vi } from 'vitest'

import { enterDestination } from './useEnterBuilding'
import { initialJourneyState, JOURNEY_ROW } from '../../services/buildingJourney'
import { PERIOD_SETTINGS_SHEET } from '../../services/sheetNames'

const rows = vi.hoisted(() => ({ period: null as string[][] | null }))

vi.mock('../../services/spreadsheetStore', () => ({
  getSheetDataRows: (_id: string, sheet: string) =>
    sheet === PERIOD_SETTINGS_SHEET ? rows.period : null
}))

vi.mock('../../services/settings', () => ({ getSettings: () => ({ spreadsheetId: 'b1' }) }))

describe('enterDestination', () => {
  beforeEach(() => {
    rows.period = null
  })

  it('honours the explicit target even when the mirror has no journey yet', () => {
    expect(enterDestination('building-setup', 'new-building')).toBe('building-setup')
  })

  it('opens the setup of an unfinished journey and the dashboard otherwise', () => {
    rows.period = [[JOURNEY_ROW, JSON.stringify(initialJourneyState()), 't']]
    expect(enterDestination(undefined, 'b1')).toBe('building-setup')

    rows.period = [['نوع فضا', 'ساختمان', 't']]
    expect(enterDestination(undefined, 'b1')).toBe('building-dashboard')
  })
})
