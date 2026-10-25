/** A shared record edited or deleted inside the shared account (spec «When the partner edits…»). */
export interface SharedCopyChange {
  kind: 'edit' | 'delete'
  recordId: string
  /** The row as it was before the change. */
  values: Record<string, string>
  /** For an edit: the field that changed and its new value. */
  field?: string
  next?: string | number
}

/**
 * Hook point for the change notices (Task 10): called after a shared record's amount is saved or
 * its delete is written. A copy of a personal record (`مرجع` = `share:…`) edited by someone who is
 * not its creator will raise a notice for the creator here. A no-op for now.
 */
export function onSharedCopyChanged(change: SharedCopyChange): void {
  void change
}
