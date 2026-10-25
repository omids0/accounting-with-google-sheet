import { beforeEach, describe, expect, it, vi } from 'vitest'

import { enqueueSharedLink, readCopyChoice, runSharedLinks } from './sharedLink'
import {
  clearSharedLinkFailures,
  pendingSharedLink,
  readSharedLinks,
  type SharedLinkTask
} from './sharedLinkPrefs'
import { buildCopyRow, sharedRecordForm, sharedRef } from './sharedLinkRows'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { buildHeaders } from './sheetsHeaders'

const { writeToWorkspace, drainWorkspace, batchFetch, titles } = vi.hoisted(() => ({
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  drainWorkspace: vi.fn(async () => true),
  batchFetch: vi.fn(),
  titles: vi.fn(async () => ['هزینه', 'هزینه 1404', 'درآمد', 'تنظیمات دوره'])
}))

vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))
vi.mock('./sheetsEnsure', () => ({ getSheetTitles: titles }))
vi.mock('./auth', () => ({ getUserEmail: () => 'me@x.com' }))

const SHARED = 'shared-1'
const REF = sharedRef('p1', 'r1')
const form = sharedRecordForm('expense')
const headers = buildHeaders(form.fields)
const task = (
  kind: SharedLinkTask['kind'],
  values: Record<string, string | number> = {}
): Omit<SharedLinkTask, 'id' | 'attempts'> => ({
  kind,
  sharedId: SHARED,
  personalId: 'p1',
  recordId: 'r1',
  ref: REF,
  type: 'expense',
  values: { date: '2026-10-20', title: 'میوه', amount: 850000, category: 'خوراک', ...values },
  split: 'equal',
  payer: ''
})

const landed = buildCopyRow({
  form,
  headers,
  recordId: 'copy-1',
  values: task('create').values,
  split: 'equal',
  payer: 'me@x.com',
  creator: 'me@x.com',
  category: 'خوراک',
  ref: REF,
  createdAt: 'then'
})

const sheet = (rows: string[][]) =>
  batchFetch.mockResolvedValue(
    new Map([
      [PERIOD_SETTINGS_SHEET, [['کلید'], ['نقش:me@x.com', 'owner']]],
      [CATEGORIES_SHEET, [['نوع'], ['هزینه', 'خوراک'], ['هزینه', 'سایر']]],
      ['هزینه', [headers]],
      ['هزینه 1404', [headers, ...rows]]
    ])
  )

beforeEach(() => {
  localStorage.clear()
  writeToWorkspace.mockClear()
  drainWorkspace.mockClear()
  batchFetch.mockReset()
  sheet([])
  vi.stubGlobal('navigator', { onLine: true })
})

describe('the queue', () => {
  it('a delete before the create ran leaves nothing queued', () => {
    enqueueSharedLink(task('create'))
    enqueueSharedLink(task('delete'))

    expect(readSharedLinks()).toEqual([])
  })

  it('keeps only the latest of two updates', () => {
    enqueueSharedLink(task('update', { amount: 1 }))
    enqueueSharedLink(task('update', { amount: 2 }))

    expect(readSharedLinks()).toHaveLength(1)
    expect(readSharedLinks()[0].values.amount).toBe(2)
    expect(pendingSharedLink('r1')).toBe(true)
  })

  it('an update before the create ran is still the create, with the newer values', () => {
    enqueueSharedLink(task('create'))
    enqueueSharedLink(task('update', { amount: 3 }))

    expect(readSharedLinks()).toMatchObject([{ kind: 'create', values: { amount: 3 } }])
  })

  it('an update that leaves the panel unset keeps the split and payer of the queued create', () => {
    enqueueSharedLink({ ...task('create'), split: 'only:mina@x.com', payer: 'mina@x.com' })
    enqueueSharedLink({ ...task('update', { amount: 3, category: '' }), split: '', payer: '' })

    expect(readSharedLinks()).toMatchObject([
      {
        kind: 'create',
        split: 'only:mina@x.com',
        payer: 'mina@x.com',
        values: { amount: 3, category: 'خوراک' }
      }
    ])
  })

  it('«فقط از حساب شخصی» before the create ran keeps that create, without a link', () => {
    enqueueSharedLink(task('create'))
    enqueueSharedLink({ ...task('update'), values: {}, unlink: true })

    expect(readSharedLinks()).toMatchObject([
      { kind: 'create', unlink: true, values: { amount: 850000, title: 'میوه' } }
    ])
  })
})

describe('runSharedLinks', () => {
  it('appends a new copy and drops the task', async () => {
    enqueueSharedLink(task('create'))
    await runSharedLinks()

    expect(writeToWorkspace).toHaveBeenCalledWith(
      SHARED,
      expect.objectContaining({ type: 'append', sheetName: 'هزینه' })
    )
    expect(readSharedLinks()).toEqual([])
  })

  it('appends nothing when the ref is already there (idempotent create)', async () => {
    sheet([landed])
    enqueueSharedLink(task('create'))
    await runSharedLinks()

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readSharedLinks()).toEqual([])
  })

  it('updates the found row on update', async () => {
    sheet([landed])
    enqueueSharedLink(task('update', { amount: 900000 }))
    await runSharedLinks()

    expect(writeToWorkspace).toHaveBeenCalledWith(
      SHARED,
      expect.objectContaining({ type: 'update', sheetName: 'هزینه 1404', rowNumber: 2 })
    )
  })

  it('completes a delete of a missing ref without error', async () => {
    enqueueSharedLink(task('update'))
    enqueueSharedLink(task('delete'))
    await expect(runSharedLinks()).resolves.toBeUndefined()

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readSharedLinks()).toEqual([])
  })

  it('leaves the tasks queued while offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    enqueueSharedLink(task('create'))
    await runSharedLinks()

    expect(batchFetch).not.toHaveBeenCalled()
    expect(readSharedLinks()).toHaveLength(1)
  })

  it('keeps a task whose read fails for a later run', async () => {
    batchFetch.mockRejectedValueOnce(new Error('network'))
    enqueueSharedLink(task('create'))
    await runSharedLinks()

    expect(readSharedLinks()).toMatchObject([{ attempts: 1 }])
    expect(readSharedLinks()[0].failed).toBeUndefined()
  })

  it('marks a task it can never send (no access) as failed instead of retrying', async () => {
    batchFetch.mockRejectedValueOnce(new Error('The caller does not have permission'))
    enqueueSharedLink(task('create'))
    await runSharedLinks()

    expect(readSharedLinks()[0].failed).toBeTruthy()
  })

  it('keeps a delete it cannot send as failed, and sends it once the failures are cleared', async () => {
    sheet([landed])
    batchFetch.mockRejectedValueOnce(new Error('The caller does not have permission'))
    enqueueSharedLink(task('update'))
    enqueueSharedLink(task('delete'))
    await runSharedLinks()

    expect(readSharedLinks()).toMatchObject([{ kind: 'delete', failed: expect.any(String) }])

    clearSharedLinkFailures()
    await runSharedLinks()

    expect(writeToWorkspace).toHaveBeenCalledWith(
      SHARED,
      expect.objectContaining({ type: 'delete' })
    )
    expect(readSharedLinks()).toEqual([])
  })

  it('reads the split, payer and category of an existing copy for the edit form', async () => {
    const chosen = buildCopyRow({
      form,
      headers,
      recordId: 'copy-1',
      values: task('create').values,
      split: 'only:mina@x.com',
      payer: 'mina@x.com',
      creator: 'me@x.com',
      category: 'سایر',
      ref: REF
    })

    sheet([chosen])

    await expect(readCopyChoice(SHARED, 'expense', REF)).resolves.toEqual({
      split: 'only:mina@x.com',
      payer: 'mina@x.com',
      category: 'سایر'
    })
  })

  it('refuses to write without the record permission', async () => {
    batchFetch.mockResolvedValue(
      new Map([[PERIOD_SETTINGS_SHEET, [['کلید'], ['نقش:me@x.com', 'viewer']]]])
    )
    enqueueSharedLink(task('create'))
    await runSharedLinks()

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readSharedLinks()[0].failed).toBeTruthy()
  })
})
