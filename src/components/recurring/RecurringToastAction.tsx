import { useState } from 'react'
import toast from 'react-hot-toast'

import RecurringModeOptions from './RecurringModeOptions'
import { recurringFromRecord, type RecurringChoice } from '../../services/recurring'
import { saveRecurringItem } from '../../services/recurringSheet'
import { getSettings } from '../../services/settings'
import type { RecurringItem } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import { NUDGE_TOAST_ID } from '../nudges/NudgeToast'
import Button from '../ui/Button'
import {
  nudgeActionsClass,
  nudgeCardClass,
  nudgeLinkClass,
  nudgeStackClass
} from '../ui/nudgeStyles'
import { recurringToastLinkClass } from '../ui/recurringStyles'

/** The saved record, as the «تکرار ماهانه» option needs it. */
export interface SavedRecordDraft {
  type: RecurringItem['type']
  values: Record<string, string | number>
  /** ISO date of the record: its day becomes the item's day of month. */
  dateIso: string
}

/** Creates the «تکرارها» row for a just-saved record (not for «بدون تکرار»). */
export async function saveRecurringFromRecord(
  draft: SavedRecordDraft,
  choice: RecurringChoice
): Promise<void> {
  const spreadsheetId = getSettings()?.spreadsheetId

  if (!spreadsheetId || choice === 'none') return

  await saveRecurringItem(
    spreadsheetId,
    recurringFromRecord(draft.type, draft.values, draft.dateIso, choice, {
      id: crypto.randomUUID(),
      createdAt: new Date().toLocaleString('fa-IR')
    })
  )
  showSuccess(choice === 'auto' ? 'هر ماه خودکار ثبت می‌شود' : 'اول هر ماه یادآوری می‌شود')
}

/** «تکرار این تراکنش» in place of the saved toast (wireframe phone 2 sheet). */
function RecurringPickerCard({ draft }: { draft: SavedRecordDraft }) {
  const [choice, setChoice] = useState<RecurringChoice>('reminder')
  const [saving, setSaving] = useState(false)
  const close = () => toast.dismiss(NUDGE_TOAST_ID)

  const save = async () => {
    setSaving(true)
    try {
      await saveRecurringFromRecord(draft, choice)
      close()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'تکرار ذخیره نشد' })
      setSaving(false)
    }
  }

  return (
    <div className={nudgeStackClass} role="dialog" aria-label="تکرار این تراکنش">
      <div className={nudgeCardClass}>
        <b>تکرار این تراکنش</b>
        <div className="mt-2">
          <RecurringModeOptions value={choice} onChange={setChoice} label="هر ماه، همین روز" />
        </div>
        <div className={nudgeActionsClass}>
          <Button type="button" size="sm" loading={saving} disabled={saving} onClick={save}>
            ذخیره
          </Button>
          <button type="button" className={nudgeLinkClass} onClick={close} disabled={saving}>
            انصراف
          </button>
        </div>
      </div>
    </div>
  )
}

/** «تکرار ماهانه» inside the «ذخیره شد» toast; a tap swaps the toast for the picker. */
export default function RecurringToastAction({ draft }: { draft: SavedRecordDraft }) {
  return (
    <button
      type="button"
      className={recurringToastLinkClass}
      onClick={() =>
        toast.custom(<RecurringPickerCard draft={draft} />, {
          id: NUDGE_TOAST_ID,
          duration: Infinity
        })
      }
    >
      تکرار ماهانه
    </button>
  )
}
