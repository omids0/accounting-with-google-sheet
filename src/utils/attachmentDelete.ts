/** «پیوست هم پاک شود؟» when a record, check or plan with receipts is deleted. */
export type AttachmentDeleteAnswer = 'delete' | 'keep'

/** Only parents that hold uploaded files get the question. */
export function shouldAskAttachmentDelete(fileIds: readonly string[]): boolean {
  return fileIds.length > 0
}

/** The Drive files to remove once the parent row is gone. Default answer: delete. */
export function fileIdsToDelete(
  fileIds: readonly string[],
  answer: AttachmentDeleteAnswer = 'delete'
): string[] {
  return answer === 'delete' ? [...fileIds] : []
}

export function attachmentDeleteMessage(count: number): string {
  const label = count.toLocaleString('fa-IR')

  return `${label} فایل پیوست در Google Drive هست. با حذف این مورد، فایل‌ها هم پاک شوند؟`
}
