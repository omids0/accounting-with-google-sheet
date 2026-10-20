import type { ReactNode } from 'react'

import FormModal from '../FormModal'
import { journeyNoteClass } from '../ui/buildingStyles'

export interface IssueChargesSheetProps {
  open: boolean
  /** Jalali `YYYY-MM`: the month to issue. */
  monthKey: string
  /** The journey's first issue: always manual, with the preview. */
  firstIssue?: boolean
  /** The journey's step bar. */
  header?: ReactNode
  onClose: () => void
  /** Called once the charges are written; `count` is how many units were billed. */
  onIssued: (count: number) => void
}

/**
 * Round 11, Step 4 owns this sheet (preview table, due date, note, «صدور برای N واحد»). Until
 * then it only holds the place the journey's step 6 opens, with the props Step 4 fills in; the
 * journey's «رد کردن» leaves the charges page empty with «صدور اولین شارژ».
 */
export default function IssueChargesSheet({ open, header, onClose }: IssueChargesSheetProps) {
  return (
    <FormModal
      open={open}
      title="شارژ اول"
      header={header}
      onClose={onClose}
      onSubmit={event => event.preventDefault()}
      saveLabel="صدور شارژ"
      saveDisabled
      cancelLabel="بستن"
    >
      <p className={journeyNoteClass}>
        شارژ اول همیشه دستی و با پیش‌نمایش صادر می‌شود؛ صدور خودکار ماه‌های بعد فقط بعد از آن شروع
        می‌شود.
      </p>
      <p className={journeyNoteClass}>
        پیش‌نمایش و صدور شارژ ماهانه به‌زودی اضافه می‌شود؛ فعلاً این قدم را رد کن.
      </p>
    </FormModal>
  )
}
