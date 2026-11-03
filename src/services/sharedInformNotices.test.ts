import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onSharedCopyChanged } from './sharedCopyChanged'
import { raiseInformNotice } from './sharedInformNotices'
import { sharedRef } from './sharedLinkRows'
import { dismissNotice, readNotices, refreshNotices, type SharedNotice } from './sharedNotices'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { SHARED_CREATOR_FIELD_ID, SHARED_REF_FIELD_ID } from '../components/form/sharedFields'

const { setMemberSetting, writeToWorkspace, batchFetch } = vi.hoisted(() => ({
  setMemberSetting: vi.fn(async (_id: string, _key: string, _value: string) => undefined),
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  batchFetch: vi.fn()
}))

vi.mock('./buildingSettings', () => ({ setMemberSetting }))
vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace: async () => true }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))
vi.mock('./auth', () => ({ getUserEmail: () => 'mina@x.com' }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSettings: () => ({ spreadsheetId: 'shared-routing', forms: [] }),
  getSpreadsheets: () => []
}))

const pending = (patch: Partial<SharedNotice> = {}): SharedNotice => ({
  recordRef: 'record:c1',
  field: 'amount',
  old: '800000',
  new: '850000',
  by: 'mina@x.com',
  time: '2026-10-27T10:00:00.000Z',
  kind: 'edit',
  title: 'قبض برق',
  inform: true,
  ...patch
})

const row = (email: string, id: string, notice: SharedNotice) => [
  `اعلان:${email}:${id}`,
  JSON.stringify(notice)
]

/** The creator's device has already read these «تنظیمات دوره» rows of `sharedId`. */
async function withRows(sharedId: string, rows: string[][]) {
  batchFetch.mockResolvedValue(new Map([[PERIOD_SETTINGS_SHEET, [['کلید'], ...rows]]]))
  await refreshNotices(sharedId)
}

const change = {
  field: 'amount',
  old: '800000',
  new: '850000',
  kind: 'edit',
  title: 'قبض برق'
} as const
const record = { id: 'c1', creator: 'Nima@x.com' }

beforeEach(() => {
  setMemberSetting.mockClear()
  writeToWorkspace.mockClear()
  batchFetch.mockReset()
  batchFetch.mockResolvedValue(new Map())
  vi.stubGlobal('navigator', { onLine: true })
})

describe('raiseInformNotice', () => {
  it('writes an inform-only notice for the creator when another member edits', async () => {
    expect(await raiseInformNotice('s-new', record, 'Mina@x.com', change)).toBe(true)

    const [target, key, value] = setMemberSetting.mock.calls[0]

    expect(target).toBe('s-new')
    expect(key).toBe('اعلان:nima@x.com:i-c1-amount')
    expect(JSON.parse(value)).toMatchObject({
      recordRef: 'record:c1',
      field: 'amount',
      old: '800000',
      new: '850000',
      by: 'mina@x.com',
      kind: 'edit',
      title: 'قبض برق',
      inform: true
    })
  })

  it('writes nothing for the creator’s own edit or a record without a creator', async () => {
    expect(await raiseInformNotice('s-own', record, ' NIMA@x.com ', change)).toBe(false)
    expect(await raiseInformNotice('s-own', { id: 'c1', creator: '' }, 'mina@x.com', change)).toBe(
      false
    )
    expect(setMemberSetting).not.toHaveBeenCalled()
  })

  it('is not duplicated: the same record and field always lands on the same row', async () => {
    await raiseInformNotice('s-dup', record, 'mina@x.com', change)
    await raiseInformNotice('s-dup', record, 'mina@x.com', change)

    expect(setMemberSetting.mock.calls[0][1]).toBe(setMemberSetting.mock.calls[1][1])
  })

  it('keeps the first «از» value while the creator has not looked', async () => {
    await withRows('s-coalesce', [row('nima@x.com', 'i-c1-amount', pending())])
    await raiseInformNotice('s-coalesce', record, 'mina@x.com', {
      ...change,
      old: '850000',
      new: '900000'
    })

    expect(JSON.parse(setMemberSetting.mock.calls[0][2])).toMatchObject({
      old: '800000',
      new: '900000'
    })
  })

  it('removes the pending notice when the amount is edited back', async () => {
    await withRows('s-back', [row('nima@x.com', 'i-c1-amount', pending())])

    expect(
      await raiseInformNotice('s-back', record, 'mina@x.com', {
        ...change,
        old: '850000',
        new: '800000'
      })
    ).toBe(false)
    expect(setMemberSetting).not.toHaveBeenCalled()

    const [[target, operations]] = writeToWorkspace.mock.calls as unknown as [
      string,
      { type: string; rowNumber: number }[]
    ][]

    expect(target).toBe('s-back')
    expect(operations).toEqual([expect.objectContaining({ type: 'delete', rowNumber: 2 })])
  })

  it('a delete replaces the pending edit notices of that record and keeps other records’', async () => {
    await withRows('s-del', [
      row('nima@x.com', 'i-c1-amount', pending()),
      row('nima@x.com', 'i-c2-amount', pending({ recordRef: 'record:c2' }))
    ])
    await raiseInformNotice('s-del', record, 'mina@x.com', {
      field: 'delete',
      kind: 'delete',
      old: '850000',
      new: '',
      title: 'قبض برق'
    })

    const [[, operations]] = writeToWorkspace.mock.calls as unknown as [
      string,
      { type: string; rowNumber: number }[]
    ][]

    expect(operations).toEqual([expect.objectContaining({ type: 'delete', rowNumber: 2 })])
    expect(setMemberSetting.mock.calls[0][1]).toBe('اعلان:nima@x.com:i-c1-delete')
    expect(JSON.parse(setMemberSetting.mock.calls[0][2])).toMatchObject({
      kind: 'delete',
      inform: true
    })
  })
})

describe('onSharedCopyChanged routing', () => {
  const values = {
    title: 'قبض برق',
    amount: '800000',
    [SHARED_CREATOR_FIELD_ID]: 'nima@x.com',
    [SHARED_REF_FIELD_ID]: ''
  }

  it('a non-creator’s amount edit of a direct record raises an inform notice', async () => {
    await onSharedCopyChanged({ kind: 'edit', recordId: 'c1', values, next: { amount: 850000 } })

    expect(setMemberSetting).toHaveBeenCalledTimes(1)
    expect(setMemberSetting.mock.calls[0][1]).toBe('اعلان:nima@x.com:i-c1-amount')
  })

  it('a non-creator’s delete of a direct record raises an inform delete notice', async () => {
    await onSharedCopyChanged({ kind: 'delete', recordId: 'c1', values })

    expect(JSON.parse(setMemberSetting.mock.calls[0][2])).toMatchObject({
      field: 'delete',
      kind: 'delete',
      inform: true,
      title: 'قبض برق'
    })
  })

  it('the creator’s own edit and delete raise nothing', async () => {
    const own = { ...values, [SHARED_CREATOR_FIELD_ID]: 'mina@x.com' }

    await onSharedCopyChanged({ kind: 'edit', recordId: 'c1', values: own, next: { amount: 1 } })
    await onSharedCopyChanged({ kind: 'delete', recordId: 'c1', values: own })

    expect(setMemberSetting).not.toHaveBeenCalled()
  })

  it('a copy of a personal record keeps the apply notice, not an inform one', async () => {
    await onSharedCopyChanged({
      kind: 'edit',
      recordId: 'c1',
      values: { ...values, [SHARED_REF_FIELD_ID]: sharedRef('p1', 'r1') },
      next: { amount: 850000 }
    })

    const key = setMemberSetting.mock.calls[0][1]

    expect(key).toMatch(/^اعلان:nima@x\.com:[0-9a-f-]{36}$/)
    expect(JSON.parse(setMemberSetting.mock.calls[0][2]).inform).toBeUndefined()
  })
})

describe('shown and dismissed', () => {
  it('the creator reads the inform notice, others do not; dismiss deletes its row', async () => {
    await withRows('s-read', [
      row('nima@x.com', 'i-c1-amount', pending()),
      row('sara@x.com', 'i-c9-amount', pending({ recordRef: 'record:c9' }))
    ])

    expect(readNotices('s-read', 'Nima@x.com').map(item => [item.id, item.inform])).toEqual([
      ['i-c1-amount', true]
    ])

    await dismissNotice('s-read', 'i-c1-amount')
    // dismiss reads as the signed-in user (mina): another user's row is never deleted by it.
    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('dismissing your own inform notice deletes only that row', async () => {
    await withRows('s-mine', [
      row('mina@x.com', 'i-c1-amount', pending({ by: 'nima@x.com' })),
      row('mina@x.com', 'i-c2-amount', pending({ recordRef: 'record:c2' }))
    ])
    await dismissNotice('s-mine', 'i-c1-amount')

    const [[, operations]] = writeToWorkspace.mock.calls as unknown as [
      string,
      { type: string; rowNumber: number }[]
    ][]

    expect(operations).toEqual([expect.objectContaining({ type: 'delete', rowNumber: 2 })])
  })
})
