import { beforeEach, describe, expect, it } from 'vitest'

import { SHARED_SHEET_SPECS } from './moduleSheetSpecs'
import { getDefaultSettings, saveSettings } from './settings'
import {
  ACTIVITY_LOG_SHEET,
  BUILDING_RESIDENTS_SHEET,
  BUILDING_SHEET,
  BUILDING_UNITS_SHEET,
  CATEGORIES_SHEET,
  PERIOD_SETTINGS_SHEET,
  PERSONAL_ONLY_SHEETS
} from './sheetNames'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { getAllSheetSpecs } from './spreadsheetSetup'
import { setWorkspaceType } from './workspace'

const names = (specs: { sheetName: string }[]) => specs.map(spec => spec.sheetName)

const BUILDING_TABS = [BUILDING_SHEET, BUILDING_UNITS_SHEET, BUILDING_RESIDENTS_SHEET]

describe('the tab set of a shared account', () => {
  const settings = getDefaultSettings()

  const formTabs = settings.forms.map(form => form.sheetName)

  beforeEach(() => {
    localStorage.clear()
    saveSettings({ ...settings, spreadsheetId: 'personal-1' })
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('shared-1', 'shared')
  })

  it('has the two record forms, the period settings, the activity log and the categories', () => {
    expect(names(getAllSheetSpecs('shared-1'))).toEqual(
      expect.arrayContaining([
        ...formTabs,
        PERIOD_SETTINGS_SHEET,
        ACTIVITY_LOG_SHEET,
        CATEGORIES_SHEET
      ])
    )
  })

  it('is exactly the forms plus the named shared list, with no duplicates', () => {
    const shared = names(getAllSheetSpecs('shared-1'))

    expect(shared).toEqual([...formTabs, ...names(SHARED_SHEET_SPECS)])
    expect(new Set(shared).size).toBe(shared.length)
  })

  it('never has a personal-only or a building tab', () => {
    const shared = names(getAllSheetSpecs('shared-1'))

    for (const tab of [...PERSONAL_ONLY_SHEETS, ...BUILDING_TABS]) expect(shared).not.toContain(tab)
  })

  it('is smaller than a building file and than a personal file', () => {
    const shared = getAllSheetSpecs('shared-1').length

    expect(shared).toBeLessThan(getAllSheetSpecs('building-1').length)
    expect(shared).toBeLessThan(getAllSheetSpecs('personal-1').length)
  })

  it('follows the active spreadsheet when none is given', () => {
    saveSettings({ ...settings, spreadsheetId: 'shared-1' })
    expect(names(getAllSheetSpecs())).toEqual(names(getAllSheetSpecs('shared-1')))
  })

  it('is the same list a sync pulls', () => {
    const known = getKnownSheetNames(settings, 'shared-1')

    expect(known).toEqual(
      expect.arrayContaining([
        ...formTabs,
        PERIOD_SETTINGS_SHEET,
        ACTIVITY_LOG_SHEET,
        CATEGORIES_SHEET
      ])
    )
    expect([...known].sort()).toEqual(names(getAllSheetSpecs('shared-1')).sort())
  })

  it('never pulls a personal-only or a building tab, while building and personal stay as before', () => {
    const known = getKnownSheetNames(settings, 'shared-1')

    for (const tab of [...PERSONAL_ONLY_SHEETS, ...BUILDING_TABS]) expect(known).not.toContain(tab)
    expect(getKnownSheetNames(settings, 'building-1')).toEqual(
      expect.arrayContaining(BUILDING_TABS)
    )
    expect(getKnownSheetNames(settings, 'personal-1')).toEqual(
      expect.arrayContaining([...PERSONAL_ONLY_SHEETS])
    )
  })
})
