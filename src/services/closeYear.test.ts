import { describe, expect, it } from 'vitest'

import {
  closeYearDefaultYear,
  deriveCloseYearSteps,
  esfandStartIso,
  esfandStartMs,
  isClosableYear,
  nextYearOpeningMonth,
  type CloseYearAccount,
  type CloseYearInput
} from './closeYear'

// 1 Esfand 1404 = 2026-02-20; 1 Farvardin 1405 = 2026-03-21.
const BEFORE_ESFAND = '2026-02-10T09:00:00.000Z'
const AFTER_ESFAND = '2026-03-01T09:00:00.000Z'

const bank = (id: string, reconciledAt?: string): CloseYearAccount => ({
  id,
  title: id,
  cash: false,
  smsBacked: true,
  reconciledAt
})

const CASH: CloseYearAccount = { id: 'cash', title: 'نقد', cash: true, smsBacked: false }

function input(patch: Partial<CloseYearInput> = {}): CloseYearInput {
  return {
    year: 1404,
    accounts: [],
    cashConfirmed: false,
    openingMonthKeys: [],
    pendingArchiveRows: null,
    ...patch
  }
}

describe('close-year dates', () => {
  it('starts reconciliation on 1 Esfand and writes فروردین of the next year', () => {
    expect(esfandStartIso(1404)).toBe('2026-02-20')
    expect(nextYearOpeningMonth(1404)).toBe('1405-01')
  })

  it('defaults to the ending year from 25 Esfand, else the last finished one', () => {
    expect(closeYearDefaultYear('2026-10-13')).toBe(1404) // Mehr 1405
    expect(closeYearDefaultYear('2026-03-16')).toBe(1404) // 25 Esfand 1404
    expect(closeYearDefaultYear('2026-03-10')).toBe(1403) // 19 Esfand 1404
    expect(closeYearDefaultYear('2026-03-25')).toBe(1404) // 5 Farvardin 1405
  })

  it('accepts finished years only, plus the ending one in its window', () => {
    expect(isClosableYear(1404, '2026-10-13')).toBe(true)
    expect(isClosableYear(1405, '2026-10-13')).toBe(false)
    expect(isClosableYear(1404, '2026-03-16')).toBe(true)
    expect(isClosableYear(Number.NaN, '2026-10-13')).toBe(false)
    expect(isClosableYear(99, '2026-10-13')).toBe(false)
  })
})

describe('reconcile step', () => {
  it('is pending while accounts load', () => {
    expect(deriveCloseYearSteps(input({ accounts: null })).reconcile.done).toBe(false)
  })

  it('needs every SMS-backed account reconciled after 1 Esfand', () => {
    const late = deriveCloseYearSteps(input({ accounts: [bank('a', AFTER_ESFAND), bank('b')] }))

    expect(late.reconcile.done).toBe(false)
    expect(late.reconcile.smsAccounts.map(account => account.reconciled)).toEqual([true, false])

    const early = deriveCloseYearSteps(input({ accounts: [bank('a', BEFORE_ESFAND)] }))

    expect(early.reconcile.done).toBe(false)

    const all = deriveCloseYearSteps(
      input({ accounts: [bank('a', AFTER_ESFAND), bank('b', AFTER_ESFAND), CASH] })
    )

    expect(all.reconcile.done).toBe(true)
    expect(all.reconcile.cashAccounts).toHaveLength(1)
  })

  it('leaves out bank accounts without SMS and falls back to the cash tick', () => {
    const noSms = { ...bank('c'), smsBacked: false }
    const unticked = deriveCloseYearSteps(input({ accounts: [noSms, CASH] }))

    expect(unticked.reconcile.smsAccounts).toHaveLength(0)
    expect(unticked.reconcile.done).toBe(false)
    expect(
      deriveCloseYearSteps(input({ accounts: [noSms, CASH], cashConfirmed: true })).reconcile.done
    ).toBe(true)
    expect(deriveCloseYearSteps(input({ accounts: [] })).reconcile.done).toBe(true)
  })
})

describe('opening-balance step', () => {
  it('is done once «موجودی ماهانه» holds فروردین of the next year', () => {
    expect(deriveCloseYearSteps(input({ openingMonthKeys: null })).opening.done).toBe(false)
    expect(
      deriveCloseYearSteps(input({ openingMonthKeys: ['1404-11', '1404-12'] })).opening.done
    ).toBe(false)
    expect(deriveCloseYearSteps(input({ openingMonthKeys: ['1405-01'] })).opening.done).toBe(true)
  })

  it('is not needed when the automatic chain starts later', () => {
    expect(
      deriveCloseYearSteps(input({ openingMonthKeys: [], anchorMonthKey: '1405-03' })).opening.done
    ).toBe(true)
    expect(
      deriveCloseYearSteps(input({ openingMonthKeys: [], anchorMonthKey: '1404-03' })).opening.done
    ).toBe(false)
  })
})

describe('archive step', () => {
  it('is done when no row of the year is left in the form tabs', () => {
    expect(deriveCloseYearSteps(input({ pendingArchiveRows: null })).archive.done).toBe(false)
    expect(deriveCloseYearSteps(input({ pendingArchiveRows: 2140 })).archive.done).toBe(false)
    expect(deriveCloseYearSteps(input({ pendingArchiveRows: 0 })).archive.done).toBe(true)
  })
})

describe('backup step', () => {
  const archivedAt = Date.parse('2026-03-25T08:00:00.000Z')

  it('needs a backup newer than the archive', () => {
    expect(deriveCloseYearSteps(input({ archivedAt })).backup.done).toBe(false)
    expect(
      deriveCloseYearSteps(input({ archivedAt, lastBackupAt: archivedAt - 60_000 })).backup.done
    ).toBe(false)
    expect(
      deriveCloseYearSteps(input({ archivedAt, lastBackupAt: archivedAt + 60_000 })).backup.done
    ).toBe(true)
  })

  it('without an archive, needs one from 1 Esfand on', () => {
    const start = esfandStartMs(1404)

    expect(deriveCloseYearSteps(input({ lastBackupAt: start - 1 })).backup.done).toBe(false)
    expect(deriveCloseYearSteps(input({ lastBackupAt: start + 1 })).backup.done).toBe(true)
  })
})
