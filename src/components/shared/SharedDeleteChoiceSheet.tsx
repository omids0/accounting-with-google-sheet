import type { SharedDeleteAnswer } from '../../hooks/useSharedDeleteChoice'
import { getSpreadsheets } from '../../services/settings'
import { sharedNameOf } from '../../services/sharedWorkspace'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import { isSharedEntry } from '../../services/workspace'
import ConfirmActionModal from '../ConfirmActionModal'

interface SharedDeleteChoiceSheetProps {
  open: boolean
  /** The record's title, as the list shows it. */
  title: string
  onAnswer: (answer: SharedDeleteAnswer | null) => void
}

/**
 * «از هر دو حذف شود» (the quiet button) or «فقط از حساب شخصی» (the bright one: the copy stays, no
 * longer linked); ✕ backs out.
 */
export default function SharedDeleteChoiceSheet({
  open,
  title,
  onAnswer
}: SharedDeleteChoiceSheetProps) {
  const account = getSpreadsheets().find(isSharedEntry)
  const name = account ? sharedNameOf(getSpreadsheetLabel(account.name)) : 'حساب مشترک'

  return (
    <ConfirmActionModal
      open={open}
      tone="danger"
      title="حذف ثبت"
      message={`«${
        title || 'این ثبت'
      }» در «${name}» هم هست. کدام حذف شود؟\nاگر فقط از حساب شخصی حذف شود، نسخهٔ حساب مشترک می‌ماند و دیگر به این ثبت وصل نیست.`}
      confirmLabel="از هر دو حذف شود"
      cancelLabel="فقط از حساب شخصی"
      onConfirm={() => onAnswer('both')}
      onCancel={() => onAnswer('one')}
      onClose={() => onAnswer(null)}
    />
  )
}
