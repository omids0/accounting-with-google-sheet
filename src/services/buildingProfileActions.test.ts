import { beforeEach, describe, expect, it, vi } from 'vitest'

import { profileError, saveBuildingProfile } from './buildingProfileActions'
import type { BuildingProfile } from './buildingTemplate'
import { getDefaultSettings, saveSettings } from './settings'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'boss@x.com' }))

const calls = vi.hoisted(() => ({ update: [] as unknown[][], append: [] as unknown[][] }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

vi.mock('./sheets', () => ({
  updateSheetRow: async (...args: unknown[]) => {
    calls.update.push(args)
  },
  appendSheetRow: async (...args: unknown[]) => {
    calls.append.push(args)
  }
}))

const profile: BuildingProfile = {
  name: 'نرگس',
  address: 'خیابان گل',
  floors: 4,
  defaultCharge: 1_200_000,
  chargeMethod: 'area',
  issueDay: 3,
  dueDay: 12,
  vacancyRule: 'half'
}

beforeEach(() => {
  calls.update.length = 0
  calls.append.length = 0
  user.email = 'boss@x.com'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'b1' })
  setWorkspaceType('b1', 'building')
  setSheetAllRows('b1', 'تنظیمات دوره', [
    ['کلید', 'مقدار', 'زمان ثبت'],
    ['نقش:boss@x.com', 'manager', 't']
  ])
  setSheetAllRows('b1', 'ساختمان', [
    ['نام'],
    ['قدیمی', '', '1', '0', 'fixed', '1', '10', 'full', 't']
  ])
})

describe('building profile', () => {
  it('rejects a blank name, no floors and a negative charge', () => {
    expect(profileError({ ...profile, name: '  ' })).toBeTruthy()
    expect(profileError({ ...profile, floors: 0 })).toBeTruthy()
    expect(profileError({ ...profile, defaultCharge: -1 })).toBeTruthy()
    expect(profileError(profile)).toBeNull()
  })

  it('rewrites the one profile row under the header', async () => {
    await saveBuildingProfile('b1', profile)

    const [id, sheet, rowNumber, row] = calls.update[0] as [string, string, number, string[]]

    expect([id, sheet, rowNumber]).toEqual(['b1', 'ساختمان', 2])
    expect(row.slice(0, 8)).toEqual([
      'نرگس',
      'خیابان گل',
      '4',
      '1200000',
      'area',
      '3',
      '12',
      'half'
    ])
    expect(calls.append).toEqual([])
  })

  it('adds the row when the sheet has none yet', async () => {
    setSheetAllRows('b1', 'ساختمان', [['نام']])

    await saveBuildingProfile('b1', profile)

    expect(calls.update).toEqual([])
    expect(calls.append).toHaveLength(1)
  })

  it('is for the settings permission only', async () => {
    setSheetAllRows('b1', 'تنظیمات دوره', [
      ['کلید', 'مقدار', 'زمان ثبت'],
      ['نقش:boss@x.com', 'accountant', 't']
    ])

    await expect(saveBuildingProfile('b1', profile)).rejects.toThrow()
    expect(calls.update).toEqual([])
  })
})
