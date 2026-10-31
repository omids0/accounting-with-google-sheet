/**
 * A shared account's record detail: «ثبت‌کننده» is the LAST writer, so after a partner's edit it
 * would read as if the editor created the record. When the last writer is not the creator the
 * detail names both: «ایجاد» (the creator, with the creation time) and «آخرین ویرایش».
 */

export interface WriterRowPlan {
  created: { label: string; email: string }
  edited: { label: string; email: string }
}

const same = (a?: string, b?: string) =>
  String(a ?? '')
    .trim()
    .toLowerCase() ===
  String(b ?? '')
    .trim()
    .toLowerCase()

/** Both known and different: a row from before the creator column, or a lone writer, is not. */
export function isEditedByOther(creator?: string, writer?: string): boolean {
  return !!String(creator ?? '').trim() && !!String(writer ?? '').trim() && !same(creator, writer)
}

/** The two rows to show instead of «ثبت‌کننده», or null to keep the generic row. */
export function sharedWriterRows(creator?: string, writer?: string): WriterRowPlan | null {
  if (!isEditedByOther(creator, writer)) return null

  return {
    created: { label: 'ایجاد', email: String(creator).trim() },
    edited: { label: 'آخرین ویرایش', email: String(writer).trim() }
  }
}
