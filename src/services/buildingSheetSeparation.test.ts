import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listBackupTabs } from './backupExport'
import { saveBuildingProfile } from './buildingProfileActions'
import { createStays, fetchStays } from './buildingResidents'
import { deleteBuildingSettings, setBuildingSetting } from './buildingSettings'
import { fetchUnits, createUnits } from './buildingUnits'
import { BUILDING_SHEET_SPECS, MODULE_SHEET_SPECS } from './moduleSheetSpecs'
import { getDefaultSettings, saveSettings } from './settings'
import {
  ACTIVITY_LOG_SHEET,
  BUILDING_RESIDENTS_SHEET,
  BUILDING_SHEET,
  BUILDING_UNITS_SHEET,
  CATEGORIES_SHEET,
  CHECKS_SHEET,
  COUNTERPARTIES_SHEET,
  DANG_SHEET,
  PERIOD_SETTINGS_SHEET,
  PERSONAL_ONLY_SHEETS,
  RECEIVABLES_SHEET,
  RECURRING_SHEET,
  SMS_TEMPLATES_SHEET,
  WALLET_LEDGER_SHEET,
  WALLET_SHEET
} from './sheetNames'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { getAllSheetSpecs } from './spreadsheetSetup'
import { NOT_BUILDING_FILE_MESSAGE, setWorkspaceType } from './workspace'

const sheets = vi.hoisted(() => ({
  calls: [] as string[]
}))

vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: async (_id: string, name: string) => {
    sheets.calls.push(`ensure:${name}`)
  },
  fetchSheetRows: async (_id: string, name: string) => {
    sheets.calls.push(`fetch:${name}`)

    return []
  },
  appendSheetRow: async (_id: string, name: string) => {
    sheets.calls.push(`append:${name}`)
  },
  updateSheetRow: async (_id: string, name: string) => {
    sheets.calls.push(`update:${name}`)
  }
}))

vi.mock('./periodSettings', () => ({
  setPeriodSetting: async (_id: string, key: string) => {
    sheets.calls.push(`setting:${key}`)
  },
  deletePeriodSettings: async (_id: string, keys: string[]) => {
    sheets.calls.push(`delete:${keys.join(',')}`)
  }
}))

const BUILDING_TABS = [BUILDING_SHEET, BUILDING_UNITS_SHEET, BUILDING_RESIDENTS_SHEET]

const names = (specs: { sheetName: string }[]) => specs.map(spec => spec.sheetName)

describe('a building is its own spreadsheet', () => {
  beforeEach(() => {
    localStorage.clear()
    sheets.calls.length = 0
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 'personal-1' })
    setWorkspaceType('building-1', 'building')
  })

  describe('which tabs a spreadsheet gets', () => {
    it('keeps the three building tabs out of the personal registry', () => {
      expect(names(BUILDING_SHEET_SPECS)).toEqual(BUILDING_TABS)
      expect(names(MODULE_SHEET_SPECS)).not.toEqual(expect.arrayContaining([BUILDING_SHEET]))
      for (const tab of BUILDING_TABS) expect(names(MODULE_SHEET_SPECS)).not.toContain(tab)
    })

    it('ensures none of them on a personal spreadsheet, active or not', () => {
      for (const id of [undefined, 'personal-1', 'unknown-sheet']) {
        const specs = names(getAllSheetSpecs(id))

        for (const tab of BUILDING_TABS) expect(specs).not.toContain(tab)
      }
    })

    it('ensures all of them on a building spreadsheet, whichever one is active', () => {
      expect(names(getAllSheetSpecs('building-1'))).toEqual(expect.arrayContaining(BUILDING_TABS))
      saveSettings({ ...getDefaultSettings(), spreadsheetId: 'building-1' })
      expect(names(getAllSheetSpecs())).toEqual(expect.arrayContaining(BUILDING_TABS))
      // The personal sheet's own list is not affected by the building being open elsewhere.
      expect(names(getAllSheetSpecs('personal-1'))).not.toContain(BUILDING_UNITS_SHEET)
    })

    it('gives a building the shared tabs plus its own, without the personal-only ones', () => {
      const personal = names(getAllSheetSpecs('personal-1'))

      const shared = personal.filter(name => !PERSONAL_ONLY_SHEETS.includes(name))

      expect(names(getAllSheetSpecs('building-1'))).toEqual([...shared, ...BUILDING_TABS])
      expect(shared.length).toBeLessThan(personal.length)
    })

    it('keeps every tab a building page reads in its list', () => {
      const building = names(getAllSheetSpecs('building-1'))

      for (const tab of [
        WALLET_SHEET,
        WALLET_LEDGER_SHEET,
        RECEIVABLES_SHEET,
        DANG_SHEET,
        CHECKS_SHEET,
        COUNTERPARTIES_SHEET,
        CATEGORIES_SHEET,
        PERIOD_SETTINGS_SHEET,
        SMS_TEMPLATES_SHEET,
        RECURRING_SHEET,
        ACTIVITY_LOG_SHEET
      ]) {
        expect(building).toContain(tab)
      }
    })

    it('leaves the personal-only tabs out of a building and keeps them in a personal file', () => {
      const building = names(getAllSheetSpecs('building-1'))

      const personal = names(getAllSheetSpecs('personal-1'))

      for (const tab of PERSONAL_ONLY_SHEETS) {
        expect(building).not.toContain(tab)
        expect(personal).toContain(tab)
      }
    })
  })

  describe('which tabs a sync pulls', () => {
    const settings = getDefaultSettings()

    it('never asks a personal spreadsheet for the building tabs', () => {
      for (const id of [undefined, 'personal-1']) {
        const known = getKnownSheetNames(settings, id)

        for (const tab of BUILDING_TABS) expect(known).not.toContain(tab)
      }
    })

    it('asks a building for them', () => {
      expect(getKnownSheetNames(settings, 'building-1')).toEqual(
        expect.arrayContaining(BUILDING_TABS)
      )
    })

    it('does not pull the personal-only tabs of a building, but still pulls them for a personal file', () => {
      const building = getKnownSheetNames(settings, 'building-1')

      const personal = getKnownSheetNames(settings, 'personal-1')

      for (const tab of PERSONAL_ONLY_SHEETS) {
        expect(building).not.toContain(tab)
        expect(personal).toContain(tab)
      }
      expect(building.length).toBeLessThan(personal.length)
    })

    it('follows the active spreadsheet when none is given', () => {
      saveSettings({ ...settings, spreadsheetId: 'building-1' })
      expect(getKnownSheetNames(getDefaultSettings())).toEqual(
        expect.arrayContaining(BUILDING_TABS)
      )
    })

    it('ignores building tabs a personal spreadsheet already has by mistake', () => {
      // They stay in the file; the app simply neither pulls nor backs them up.
      expect(getKnownSheetNames(settings, 'personal-1')).not.toContain(BUILDING_UNITS_SHEET)
    })
  })

  describe('which tabs a backup holds', () => {
    it('leaves the building tabs out of a personal backup', () => {
      const tabs = listBackupTabs('personal-1').map(tab => tab.name)

      for (const tab of BUILDING_TABS) expect(tabs).not.toContain(tab)
    })

    it('puts them in the backup of a building', () => {
      const tabs = listBackupTabs('building-1').map(tab => tab.name)

      expect(tabs).toEqual(expect.arrayContaining(BUILDING_TABS))
    })
  })

  describe('building writers refuse a personal spreadsheet', () => {
    const refused = async (task: () => Promise<unknown>) => {
      await expect(task()).rejects.toThrow(NOT_BUILDING_FILE_MESSAGE)
      expect(sheets.calls).toEqual([])
    }

    it('creates no units or residents tab and no row in it', async () => {
      await refused(() => fetchUnits('personal-1'))
      await refused(() => createUnits('personal-1', []))
      await refused(() => fetchStays('personal-1'))
      await refused(() => createStays('personal-1', []))
    })

    it('writes no profile row', async () => {
      await refused(() =>
        saveBuildingProfile('personal-1', {
          name: 'x',
          address: '',
          floors: 1,
          defaultCharge: 0,
          chargeMethod: 'fixed',
          issueDay: 1,
          dueDay: 10,
          vacancyRule: 'full'
        })
      )
    })

    it('writes no role, invite, list, journey or issue marker row', async () => {
      for (const key of [
        'نقش:a@b.c',
        'دعوت:a@b.c',
        'فهرست:EXPENSE_KINDS',
        'راه‌اندازی',
        'آخرین صدور'
      ]) {
        await refused(() => setBuildingSetting('personal-1', key, 'x'))
      }
      await refused(() => deleteBuildingSettings('personal-1', ['نقش:a@b.c']))
    })

    it('lets the building itself through', async () => {
      await setBuildingSetting('building-1', 'نقش:a@b.c', 'board')
      await fetchUnits('building-1')
      expect(sheets.calls).toEqual([
        'setting:نقش:a@b.c',
        `ensure:${BUILDING_UNITS_SHEET}`,
        `fetch:${BUILDING_UNITS_SHEET}`
      ])
    })
  })
})
