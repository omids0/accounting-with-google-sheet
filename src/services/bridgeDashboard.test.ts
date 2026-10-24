import { beforeEach, describe, expect, it } from 'vitest'

import { buildingCardText, dismissCardMonth, isCardDismissed } from './bridgeDashboard'
import { initialJourneyState } from './buildingJourney'
import type { BuildingSummary } from './buildingSummary'
import { getDefaultSettings, saveSettings } from './settings'
import { setWorkspaceType } from './workspace'
import { buildingCardCandidates } from '../components/dashboard/buildingCardGate'
import { findGregorianForJalali } from '../utils/jalaliDate'

const summary = (patch: Partial<BuildingSummary> = {}): BuildingSummary => ({
  id: 'b1',
  isBuilding: true,
  name: 'نرگس',
  units: 12,
  members: 1,
  debtorUnits: 0,
  debt: 0,
  charge: null,
  issueDay: 1,
  fundTotal: 0,
  accounts: 1,
  journey: null,
  ...patch
})

/** 12th of مهر 1404. */
const MEHR_12 = findGregorianForJalali(1404, 7, 12)

/** 5th of مهر 1404. */
const MEHR_5 = findGregorianForJalali(1404, 7, 5)

const ISSUED = { monthKey: '1404-07', issued: 12, paid: 4, billed: 1, collected: 1 }

describe('buildingCardText', () => {
  it('says how many units owe and that the month is not issued', () => {
    expect(buildingCardText('ساختمان نرگس', summary({ debtorUnits: 3 }), MEHR_12)).toBe(
      'ساختمان نرگس: ۳ واحد بدهکار · شارژ مهر صادر نشده'
    )
  })

  it('leaves out what is fine', () => {
    expect(buildingCardText('ن', summary({ debtorUnits: 2, charge: ISSUED }), MEHR_12)).toBe(
      'ن: ۲ واحد بدهکار'
    )
    expect(buildingCardText('ن', summary({ charge: null }), MEHR_12)).toBe('ن: شارژ مهر صادر نشده')
  })

  it('is empty when there is nothing to do', () => {
    expect(buildingCardText('ن', summary({ charge: ISSUED }), MEHR_12)).toBeNull()
  })

  it('does not call a month unissued before its issue day', () => {
    expect(buildingCardText('ن', summary({ issueDay: 15 }), MEHR_12)).toBeNull()
  })

  it('stays out of a building still being set up, a sheet that is no building, and unread ones', () => {
    expect(
      buildingCardText('ن', summary({ journey: initialJourneyState(), debtorUnits: 5 }), MEHR_12)
    ).toBeNull()
    expect(
      buildingCardText('ن', summary({ isBuilding: false, debtorUnits: 5 }), MEHR_12)
    ).toBeNull()
    expect(buildingCardText('ن', null, MEHR_12)).toBeNull()
  })
})

describe('dismissing the card', () => {
  it('hides it for the rest of this month only', () => {
    const dismissed = dismissCardMonth({}, 'b1', MEHR_12)

    expect(isCardDismissed(dismissed, 'b1', findGregorianForJalali(1404, 7, 25))).toBe(true)
    expect(isCardDismissed(dismissed, 'b1', findGregorianForJalali(1404, 8, 10))).toBe(false)
    expect(isCardDismissed(dismissed, 'b2', MEHR_12)).toBe(false)
  })
})

describe('buildingCardCandidates', () => {
  beforeEach(() => {
    localStorage.clear()
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [
        { id: 'personal-1', name: 'حسابداری · شخصی', createdAt: '' },
        { id: 'b1', name: 'حسابداری · ساختمان نرگس', createdAt: '', kind: 'building' }
      ]
    })
  })

  it('offers the registered buildings from the 10th of the month', () => {
    expect(buildingCardCandidates(MEHR_12).map(entry => entry.id)).toEqual(['b1'])
  })

  it('offers nothing before the 10th', () => {
    expect(buildingCardCandidates(MEHR_5)).toEqual([])
  })

  it('offers nothing inside a building', () => {
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 'b1', spreadsheets: [] })
    setWorkspaceType('b1', 'building')

    expect(buildingCardCandidates(MEHR_12)).toEqual([])
  })
})
