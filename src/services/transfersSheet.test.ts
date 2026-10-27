import { beforeEach, describe, expect, it } from 'vitest'

import { mergeRowKey, planTabRestore } from './backupPlan'
import { getDefaultSettings, saveSettings } from './settings'
import { TRANSFERS_HEADERS } from './sheetHeaders'
import { PERSONAL_ONLY_SHEETS, TRANSFERS_SHEET } from './sheetNames'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { getAllSheetSpecs } from './spreadsheetSetup'
import {
  describeTransfer,
  rowToTransfer,
  sortTransfers,
  transferIsReversible,
  transferToRow,
  type Transfer
} from './transfersModel'
import { setWorkspaceType } from './workspace'
import type { WalletAccount } from '../types'

const names = (specs: { sheetName: string }[]) => specs.map(spec => spec.sheetName)

describe('the transfers tab', () => {
  const settings = getDefaultSettings()

  beforeEach(() => {
    localStorage.clear()
    saveSettings({ ...settings, spreadsheetId: 'personal-1' })
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('shared-1', 'shared')
  })

  it('has the agreed title and columns', () => {
    expect(TRANSFERS_SHEET).toBe('انتقال‌ها')
    expect(TRANSFERS_HEADERS).toEqual([
      'شناسه',
      'زمان ثبت',
      'تاریخ',
      'از حساب',
      'به حساب',
      'مبلغ',
      'یادداشت',
      'ثبت‌کننده'
    ])
  })

  it('is a personal-only tab: created, pulled and backed up for personal books only', () => {
    expect(PERSONAL_ONLY_SHEETS).toContain(TRANSFERS_SHEET)
    expect(names(getAllSheetSpecs('personal-1'))).toContain(TRANSFERS_SHEET)
    expect(getKnownSheetNames(settings, 'personal-1')).toContain(TRANSFERS_SHEET)

    for (const id of ['building-1', 'shared-1']) {
      expect(names(getAllSheetSpecs(id))).not.toContain(TRANSFERS_SHEET)
      expect(getKnownSheetNames(settings, id)).not.toContain(TRANSFERS_SHEET)
    }
  })

  it('is restored from a backup keyed by its id, so a merge never duplicates a transfer', () => {
    const csv = `${TRANSFERS_HEADERS.join(',')}\nt1,x,2026-07-01,a,b,5,,\nt2,x,2026-07-02,a,b,6,,\n`
    const existing = [TRANSFERS_HEADERS, ['t1', 'x', '2026-07-01', 'a', 'b', '5', '', '']]

    expect(mergeRowKey(TRANSFERS_SHEET)(['t1'])).toBe('t1')

    const plan = planTabRestore({
      sheetName: TRANSFERS_SHEET,
      csv,
      mode: 'merge',
      existingRows: existing
    })

    expect(plan.rows.map(row => row[0])).toEqual(['t2'])
  })
})

const account = (id: string, title: string) => ({ id, title } as WalletAccount)

const transfer: Transfer = {
  id: 't1',
  createdAt: '',
  date: '2026-07-01',
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 2_500_000,
  note: 'قسط',
  createdBy: 'me@example.com'
}

describe('a transfer row', () => {
  it('round-trips', () => {
    expect(rowToTransfer(transferToRow(transfer))).toEqual(transfer)
  })

  it('is not a transfer without an id or an account on each side', () => {
    expect(rowToTransfer(['', '', '2026-07-01', 'a', 'b', '5'])).toBeNull()
    expect(rowToTransfer(['t', '', '2026-07-01', '', 'b', '5'])).toBeNull()
    expect(rowToTransfer(['t', '', '2026-07-01', 'a', '', '5'])).toBeNull()
  })

  it('reads Persian digits and a lower-cased writer', () => {
    expect(
      rowToTransfer(['t', '', '2026-07-01', 'a', 'b', '۲۵۰۰', '', ' Me@X.com '])
    ).toMatchObject({
      amount: 2500,
      createdBy: 'me@x.com'
    })
  })

  it('sorts newest first and keeps the later row first on a tie', () => {
    const at = (id: string, date: string) => ({ ...transfer, id, date })

    expect(
      sortTransfers([at('x', '2026-06-01'), at('y', '2026-07-01'), at('z', '2026-07-01')]).map(
        item => item.id
      )
    ).toEqual(['z', 'y', 'x'])
  })
})

describe('describeTransfer', () => {
  const accounts = [account('a', 'ملت'), account('b', 'پاسارگاد')]

  it('names both accounts, the amount, the date and the note', () => {
    const { title, subtitle } = describeTransfer(transfer, accounts)

    expect(title).toBe('انتقال از «ملت» به «پاسارگاد»')
    expect(subtitle).toContain('تومان')
    expect(subtitle).toContain('قسط')
    expect(subtitle.split(' · ')).toHaveLength(3)
  })

  it('calls a deleted account «حساب حذف‌شده»', () => {
    expect(describeTransfer(transfer, [accounts[0]]).title).toBe(
      'انتقال از «ملت» به «حساب حذف‌شده»'
    )
    expect(
      describeTransfer({ ...transfer, note: '' }, accounts).subtitle.split(' · ')
    ).toHaveLength(2)
  })

  it('is reversible only while both accounts exist', () => {
    expect(transferIsReversible(transfer, accounts)).toBe(true)
    expect(transferIsReversible(transfer, [accounts[0]])).toBe(false)
  })
})
