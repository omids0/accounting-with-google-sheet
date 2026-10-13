import { beforeEach, describe, expect, it } from 'vitest'

import type { PendingAttachment } from './attachmentBlobs'
import { buildAttachmentUploadOperation } from './attachmentUpload'
import { buildMultipartBody, yearFolderName } from './driveFiles'
import { parseImportCsv } from './importPlan'
import { CHECKS_HEADERS } from './sheetHeaders'
import { addOutboxEntry, clearOutbox, getOutboxEntries, getOutboxSheetNames } from './syncOutbox'
import {
  draftChanges,
  initialDrafts,
  remainingSlots,
  type AttachmentDraft
} from '../components/attachments/attachmentDraft'

const SHEET_ID = 'sheet-attachments'

describe('attachment-upload outbox operation', () => {
  beforeEach(() => clearOutbox(SHEET_ID))

  it('holds names only, so it survives JSON (localStorage) unchanged', () => {
    const operation = buildAttachmentUploadOperation('چک‌ها', 'check-1', 'att-1')

    expect(operation).toEqual({
      type: 'attachment-upload',
      sheetName: 'چک‌ها',
      entityId: 'check-1',
      attachmentId: 'att-1'
    })
    expect(JSON.parse(JSON.stringify(operation))).toEqual(operation)
    expect(Object.values(operation).every(value => typeof value === 'string')).toBe(true)
  })

  it('is persisted and read back like every other queued write', () => {
    addOutboxEntry(SHEET_ID, { type: 'append', sheetName: 'چک‌ها', row: ['check-1'] })
    addOutboxEntry(SHEET_ID, buildAttachmentUploadOperation('چک‌ها', 'check-1', 'att-1'))

    const entries = getOutboxEntries(SHEET_ID)

    // Queued behind the row it belongs to.
    expect(entries.map(entry => entry.operation.type)).toEqual(['append', 'attachment-upload'])
    expect(entries[1].operation).toEqual(
      buildAttachmentUploadOperation('چک‌ها', 'check-1', 'att-1')
    )
    expect([...getOutboxSheetNames(SHEET_ID)]).toEqual(['چک‌ها'])
  })
})

describe('Drive helpers', () => {
  it('names the yearly folder in Persian digits', () => {
    expect(yearFolderName(1405)).toBe('۱۴۰۵')
  })

  it('builds a multipart body with metadata first and the file after', async () => {
    const { body, contentType } = buildMultipartBody(
      { name: 'r.jpg', parents: ['p1'] },
      new Blob(['BYTES']),
      'image/jpeg',
      'b0'
    )
    const text = await body.text()

    expect(contentType).toBe('multipart/related; boundary=b0')
    expect(text.indexOf('"parents":["p1"]')).toBeLessThan(text.indexOf('BYTES'))
    expect(text).toContain('Content-Type: image/jpeg')
    expect(text.endsWith('--b0--')).toBe(true)
  })
})

describe('CSV import header', () => {
  it('still recognises a checks file exported before «پیوست» existed', () => {
    const oldHeader = CHECKS_HEADERS.slice(0, -1).join(',')
    const parsed = parseImportCsv(`${oldHeader}\nid1,t,123`, CHECKS_HEADERS)

    expect(parsed.firstLine).toBe(2)
    expect(parsed.dataRows).toHaveLength(1)
  })
})

describe('form drafts', () => {
  const pending = { id: 'p1', mimeType: 'image/jpeg' } as PendingAttachment

  it('opens with the row ids and the waiting uploads', () => {
    const drafts = initialDrafts(['f1'], [pending])

    expect(drafts.map(draft => draft.kind)).toEqual(['saved', 'pending'])
    expect(remainingSlots(drafts)).toBe(1)
  })

  it('turns the edit into removals, cancellations and new uploads', () => {
    const initial = initialDrafts(['f1', 'f2'], [pending])
    const added: AttachmentDraft = {
      key: 'new:1',
      kind: 'new',
      file: { blob: new Blob(['x']), name: 'a.jpg', mimeType: 'image/jpeg' }
    }
    const changes = draftChanges(initial, [initial[1], added])

    expect(changes.removedFileIds).toEqual(['f1'])
    expect(changes.cancelledPendingIds).toEqual(['p1'])
    expect(changes.newFiles).toEqual([added.kind === 'new' ? added.file : null])
  })
})
