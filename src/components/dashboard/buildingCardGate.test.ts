import { beforeEach, describe, expect, it } from 'vitest'

import { buildingCardCandidates } from './buildingCardGate'
import { getDefaultSettings, saveSettings } from '../../services/settings'
import { setWorkspaceType } from '../../services/workspace'

// 12 Mehr 1405: past the 10th of the Jalali month.
const AFTER_THE_TENTH = new Date('2026-10-04T10:00:00')

const entries = [
  { id: 'personal-1', name: 'p', createdAt: '' },
  { id: 'building-1', name: 'b', createdAt: '', kind: 'building' as const },
  { id: 'shared-1', name: 's', createdAt: '', kind: 'shared' as const }
]

function open(id: string) {
  saveSettings({ ...getDefaultSettings(), spreadsheetId: id, spreadsheets: entries })
}

describe('buildingCardCandidates', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('shared-1', 'shared')
  })

  it('lists the registered buildings on the personal dashboard only', () => {
    open('personal-1')
    expect(buildingCardCandidates(AFTER_THE_TENTH).map(entry => entry.id)).toEqual(['building-1'])
  })

  it('lists none in a building or a shared account', () => {
    open('building-1')
    expect(buildingCardCandidates(AFTER_THE_TENTH)).toEqual([])
    open('shared-1')
    expect(buildingCardCandidates(AFTER_THE_TENTH)).toEqual([])
  })
})
