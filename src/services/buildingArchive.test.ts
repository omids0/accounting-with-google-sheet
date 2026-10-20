import { beforeEach, describe, expect, it } from 'vitest'

import { routingWorkspaces } from './bankSmsRouting'
import { isArchivedEntry, setBuildingArchived } from './buildingArchive'
import { getDefaultSettings, getSettings, getSpreadsheets, saveSettings } from './settings'

beforeEach(() => {
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 'personal',
    spreadsheets: [
      { id: 'personal', name: 'حسابداری', createdAt: 't' },
      { id: 'b1', name: 'حسابداری · ساختمان نرگس', createdAt: 't', kind: 'building' },
      { id: 'b2', name: 'حسابداری · ساختمان گل', createdAt: 't', kind: 'building' }
    ]
  })
})

describe('building archive', () => {
  it('flags only the registration of that building', () => {
    expect(setBuildingArchived('b1', true)).toBe(true)

    expect(getSpreadsheets().map(entry => [entry.id, isArchivedEntry(entry)])).toEqual([
      ['personal', false],
      ['b1', true],
      ['b2', false]
    ])
    expect(getSpreadsheets().find(entry => entry.id === 'b1')).toMatchObject({
      kind: 'building',
      name: 'حسابداری · ساختمان نرگس'
    })
  })

  it('restores by removing the flag, not by setting it to true', () => {
    setBuildingArchived('b1', true)
    setBuildingArchived('b1', false)

    expect(getSpreadsheets().find(entry => entry.id === 'b1')).not.toHaveProperty('active')
  })

  it('does not know a spreadsheet this device never registered', () => {
    expect(setBuildingArchived('unknown', true)).toBe(false)
    expect(getSettings()?.spreadsheets).toHaveLength(3)
  })

  it('takes an archived building out of the SMS routing, but never the open one', () => {
    setBuildingArchived('b1', true)

    expect(routingWorkspaces().map(item => item.id)).toEqual(['personal', 'b2'])

    saveSettings({ ...(getSettings() ?? getDefaultSettings()), spreadsheetId: 'b1' })

    expect(routingWorkspaces().map(item => item.id)).toContain('b1')
  })
})
