import type { OutboxOperation } from './syncOutbox'
import { showError } from '../utils/toast'

const ACTION_LABEL: Record<OutboxOperation['type'], string> = {
  append: 'ثبت',
  update: 'ویرایش',
  delete: 'حذف',
  replace: 'بازنویسی',
  'attachment-upload': 'آپلود پیوست'
}

/** Long enough to read and to take a screenshot of on a phone. */
const NOTICE_MS = 10_000

/**
 * The sheet turned a write down for good. The badge alone is easy to miss, and a created row
 * that is taken back out of the app otherwise looks like it vanished by itself.
 */
export function notifyRejectedWrite(
  operation: OutboxOperation,
  reason: string,
  reverted: boolean
): void {
  const what = `${ACTION_LABEL[operation.type]} در «${operation.sheetName}»`

  showError(
    `${what} در شیت اعمال نشد${reverted ? ' و از اپ هم برداشته شد' : ''}: ${reason}`,
    NOTICE_MS
  )
}
