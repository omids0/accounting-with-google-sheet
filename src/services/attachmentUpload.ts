import {
  deletePendingAttachment,
  getPendingAttachment,
  savePendingAttachment,
  type PendingAttachment
} from './attachmentBlobs'
import { findEntityRow } from './attachmentColumn'
import { addRowAttachment, removeRowAttachments } from './attachmentRows'
import {
  deleteDriveFile,
  deleteDriveFiles,
  getAttachmentFolder,
  uploadDriveFile
} from './driveFiles'
import { getSheetAllRows } from './spreadsheetStore'
import {
  getOutboxCount,
  getOutboxEntries,
  removeOutboxEntry,
  type AttachmentUploadOperation
} from './syncOutbox'
import { setPendingWrites } from './syncStatus'
import { getJalaliParts } from '../utils/jalaliDate'

/** A compressed image or a PDF, ready for Drive. */
export interface AttachmentFile {
  blob: Blob
  name: string
  mimeType: string
}

/** The outbox entry: names only, so it serializes into localStorage as is. */
export function buildAttachmentUploadOperation(
  sheetName: string,
  entityId: string,
  attachmentId: string
): AttachmentUploadOperation {
  return { type: 'attachment-upload', sheetName, entityId, attachmentId }
}

/** Keeps the file in IndexedDB and queues its upload behind the row's own write. */
export async function queueAttachmentUpload(
  spreadsheetId: string,
  sheetName: string,
  entityId: string,
  file: AttachmentFile
): Promise<string> {
  const id = crypto.randomUUID()
  const pending: PendingAttachment = {
    id,
    spreadsheetId,
    sheetName,
    entityId,
    name: file.name,
    mimeType: file.mimeType,
    blob: file.blob,
    year: getJalaliParts(new Date()).year,
    createdAt: Date.now()
  }

  await savePendingAttachment(pending)

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, buildAttachmentUploadOperation(sheetName, entityId, id))

  return id
}

/**
 * Runs inside the outbox flush: upload (once), then put the Drive id on the row.
 * The id update is an ordinary queued row write that follows in the same flush.
 */
export async function executeAttachmentUpload(
  spreadsheetId: string,
  operation: AttachmentUploadOperation
): Promise<string> {
  const pending = await getPendingAttachment(operation.attachmentId)

  // Cancelled in the form, or wiped: nothing left to send.
  if (!pending) return operation.sheetName

  if (!findEntityRow(spreadsheetId, operation.sheetName, operation.entityId)) {
    if (!getSheetAllRows(spreadsheetId, operation.sheetName)) {
      throw new Error('برگه هنوز روی دستگاه بارگذاری نشده؛ پیوست بعداً فرستاده می‌شود.')
    }
    // The parent row was deleted before its receipt left the device.
    if (pending.uploadedId) await deleteDriveFile(pending.uploadedId).catch(() => undefined)
    await deletePendingAttachment(pending.id)

    return operation.sheetName
  }

  let fileId = pending.uploadedId

  if (!fileId) {
    const folderId = await getAttachmentFolder(spreadsheetId, pending.year)

    fileId = await uploadDriveFile(pending.blob, {
      name: pending.name,
      mimeType: pending.mimeType,
      folderId
    })
    await savePendingAttachment({ ...pending, uploadedId: fileId }).catch(() => undefined)
  }

  await addRowAttachment(spreadsheetId, operation.sheetName, operation.entityId, fileId)
  await deletePendingAttachment(pending.id)

  return operation.sheetName
}

/** Takes a waiting receipt back: its outbox entry, its local copy, any early upload. */
export async function cancelPendingAttachment(
  spreadsheetId: string,
  attachmentId: string
): Promise<void> {
  for (const entry of getOutboxEntries(spreadsheetId)) {
    const { operation } = entry

    if (operation.type === 'attachment-upload' && operation.attachmentId === attachmentId) {
      removeOutboxEntry(spreadsheetId, entry.id)
    }
  }
  setPendingWrites(getOutboxCount(spreadsheetId))

  const pending = await getPendingAttachment(attachmentId)

  if (pending?.uploadedId) await deleteDriveFile(pending.uploadedId).catch(() => undefined)
  await deletePendingAttachment(attachmentId)
}

/** «حذف» in the viewer: off Drive first (needs a connection), then off the row. */
export async function deleteAttachment(
  spreadsheetId: string,
  sheetName: string,
  entityId: string,
  target: { fileId: string } | { pendingId: string }
): Promise<void> {
  if ('pendingId' in target) return cancelPendingAttachment(spreadsheetId, target.pendingId)

  await deleteDriveFile(target.fileId)
  await removeRowAttachments(spreadsheetId, sheetName, entityId, [target.fileId])
}

export interface AttachmentChanges {
  sheetName: string
  entityId: string
  /** Uploaded files the user took off the form. */
  removedFileIds: string[]
  /** Waiting uploads the user took off the form. */
  cancelledPendingIds: string[]
  newFiles: AttachmentFile[]
}

/** Applies an entity form's «پیوست» field after the entity itself was saved. */
export async function commitAttachmentChanges(
  spreadsheetId: string,
  changes: AttachmentChanges
): Promise<void> {
  const { sheetName, entityId, removedFileIds, cancelledPendingIds, newFiles } = changes

  for (const id of cancelledPendingIds) await cancelPendingAttachment(spreadsheetId, id)

  if (removedFileIds.length) {
    await removeRowAttachments(spreadsheetId, sheetName, entityId, removedFileIds)
    void deleteDriveFiles(removedFileIds)
  }

  for (const file of newFiles) {
    await queueAttachmentUpload(spreadsheetId, sheetName, entityId, file)
  }
}
