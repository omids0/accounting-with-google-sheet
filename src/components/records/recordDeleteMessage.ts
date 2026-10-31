import { undoableDeleteMessage } from '../../utils/confirmDelete'

/** Said in the first delete question when the record also lives in the shared account. */
export const SHARED_COPY_DELETE_NOTE =
  'این رکورد در حساب مشترک هم هست؛ در پنجرهٔ بعد انتخاب می‌کنی که آنجا هم حذف شود یا نه.'

/** The body of the first delete question of a personal record; `hasSharedCopy` adds the note. */
export function recordDeleteMessage(label: string, hasSharedCopy: boolean): string {
  const message = undoableDeleteMessage(label)

  return hasSharedCopy ? `${message}\n${SHARED_COPY_DELETE_NOTE}` : message
}
