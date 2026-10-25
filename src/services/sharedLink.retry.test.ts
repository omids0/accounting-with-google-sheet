import { beforeEach, describe, expect, it, vi } from 'vitest'

import { enqueueSharedLink, runSharedLinks } from './sharedLink'
import {
  pendingSharedLink,
  readSharedLinks,
  subscribeSharedLinks,
  type SharedLinkTask
} from './sharedLinkPrefs'
import { buildCopyRow, sharedRecordForm, sharedRef } from './sharedLinkRows'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { SheetsApiError } from './sheetsApi'
import { buildHeaders } from './sheetsHeaders'
import { addOutboxEntry } from './syncOutbox'

const { writeToWorkspace, drainWorkspace, batchFetch, showError } = vi.hoisted(() => ({
  showError: vi.fn(),
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  drainWorkspace: vi.fn(async () => true),
  batchFetch: vi.fn()
}))

vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))
vi.mock('./sheetsEnsure', () => ({ getSheetTitles: async () => ['هزینه', 'تنظیمات دوره'] }))
vi.mock('./auth', () => ({ getUserEmail: () => 'me@x.com' }))
vi.mock('../utils/toast', () => ({ showError }))

/** A create retried after the page closed between the outbox write and `settle`. */

const SHARED = 'shared-1'
const REF = sharedRef('p1', 'r1')
const form = sharedRecordForm('expense')
const headers = buildHeaders(form.fields)

/** «فقط از حساب شخصی» before the create left: the copy is created without a ref. */
const unlinkedCreate: Omit<SharedLinkTask, 'id' | 'attempts'> = {
  kind: 'create',
  unlink: true,
  sharedId: SHARED,
  personalId: 'p1',
  recordId: 'r1',
  ref: REF,
  type: 'expense',
  values: { date: '2026-10-20', title: 'میوه', amount: 850000, category: 'خوراک' },
  split: 'equal',
  payer: ''
}

const copyOf = (id: string) =>
  buildCopyRow({
    form,
    headers,
    recordId: id,
    values: unlinkedCreate.values,
    split: 'equal',
    payer: 'me@x.com',
    creator: 'me@x.com',
    category: 'خوراک',
    ref: '',
    createdAt: 'then'
  })

const sheet = (rows: string[][]) =>
  batchFetch.mockResolvedValue(
    new Map([
      [PERIOD_SETTINGS_SHEET, [['کلید'], ['نقش:me@x.com', 'owner']]],
      [CATEGORIES_SHEET, [['نوع'], ['هزینه', 'خوراک']]],
      ['هزینه', [headers, ...rows]]
    ])
  )

beforeEach(() => {
  localStorage.clear()
  writeToWorkspace.mockClear()
  drainWorkspace.mockClear()
  batchFetch.mockReset()
  showError.mockClear()
  vi.stubGlobal('navigator', { onLine: true })
})

describe('a retried create', () => {
  it('writes the task id as the copy id', async () => {
    sheet([])
    enqueueSharedLink(unlinkedCreate)

    const [{ id }] = readSharedLinks()

    await runSharedLinks()

    const [, operation] = writeToWorkspace.mock.calls[0] as unknown as [string, { row: string[] }]

    expect(operation.row[0]).toBe(id)
  })

  it('appends no second copy when the unlinked copy is already in the sheet', async () => {
    enqueueSharedLink(unlinkedCreate)
    sheet([copyOf(readSharedLinks()[0].id)])
    await runSharedLinks()

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readSharedLinks()).toEqual([])
  })

  it('appends no second copy while the unlinked copy still waits in the outbox', async () => {
    sheet([])
    enqueueSharedLink(unlinkedCreate)
    addOutboxEntry(SHARED, {
      type: 'append',
      sheetName: 'هزینه',
      row: copyOf(readSharedLinks()[0].id)
    })
    await runSharedLinks()

    expect(drainWorkspace).toHaveBeenCalledWith(SHARED)
    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readSharedLinks()).toHaveLength(1)
  })
})

describe('a missing record tab', () => {
  it('is reported as such, not as a lost file', async () => {
    batchFetch.mockRejectedValue(new SheetsApiError('Unable to parse range: هزینه', 400))
    enqueueSharedLink(unlinkedCreate)
    await runSharedLinks()

    expect(readSharedLinks()[0].failed).toContain('برگه')
    expect(showError.mock.calls[0][0]).not.toContain('پاک شده')
  })
})

describe('the change signal', () => {
  it('tells a row when its copy lands, so «در انتظار ارسال» goes away', async () => {
    const seen: boolean[] = []
    const stop = subscribeSharedLinks(() => seen.push(pendingSharedLink('r1')))

    sheet([])
    enqueueSharedLink(unlinkedCreate)
    await runSharedLinks()
    stop()

    expect(seen[0]).toBe(true)
    expect(seen.at(-1)).toBe(false)
  })
})
