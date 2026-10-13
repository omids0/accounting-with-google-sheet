import { createIdbStore } from './idbStore'

/** A receipt picked on this device that Drive has not confirmed yet. */
export interface PendingAttachment {
  id: string
  spreadsheetId: string
  sheetName: string
  /** Column A id of the row the file belongs to. */
  entityId: string
  name: string
  mimeType: string
  blob: Blob
  /** Jalali year of its «پیوست‌ها/<year>» folder. */
  year: number
  createdAt: number
  /** Set as soon as Drive accepted the file, so a retry never uploads it twice. */
  uploadedId?: string
}

/** Blobs do not belong in localStorage: the outbox entry only names this record. */
const blobDb = createIdbStore({
  dbName: 'accounting_attachments',
  storeName: 'pending',
  keyPath: 'id'
})

const EMPTY: PendingAttachment[] = []

let cache: PendingAttachment[] | null = null

let loading: Promise<PendingAttachment[]> | null = null

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribePendingAttachments(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/** What the lists show next to a row while its upload waits; empty until loaded. */
export function getPendingAttachmentsSnapshot(): PendingAttachment[] {
  return cache ?? EMPTY
}

export function loadPendingAttachments(): Promise<PendingAttachment[]> {
  loading ??= blobDb
    .getAll<PendingAttachment>()
    .then(items => {
      cache = items.sort((a, b) => a.createdAt - b.createdAt)
      emit()

      return cache
    })
    .finally(() => {
      loading = null
    })

  return loading
}

export async function savePendingAttachment(item: PendingAttachment): Promise<void> {
  if (!(await blobDb.put(item))) {
    throw new Error('ذخیرهٔ پیوست روی این دستگاه ممکن نشد.')
  }
  await loadPendingAttachments()
}

export function getPendingAttachment(id: string): Promise<PendingAttachment | null> {
  return blobDb.get<PendingAttachment>(id)
}

export async function deletePendingAttachment(id: string): Promise<void> {
  await blobDb.delete(id)
  await loadPendingAttachments()
}

/** Sign-out: the files waiting here belong to the old account. */
export async function deleteAttachmentDatabase(): Promise<void> {
  cache = null
  await blobDb.deleteDatabase()
  emit()
}
