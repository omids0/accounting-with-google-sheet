import Alert from '../ui/Alert'
import Button from '../ui/Button'

type InstallmentHiddenNoticeProps = {
  /** Plans with no due date in the list's period. */
  count: number
  onShowAll: () => void
}

/**
 * A plan whose installments all fall outside the period (first due next month) is saved but
 * not listed, which reads as «it was not saved». This says so and offers the way to see it.
 */
export default function InstallmentHiddenNotice({
  count,
  onShowAll
}: InstallmentHiddenNoticeProps) {
  return (
    <Alert
      variant="info"
      role="status"
      className="flex flex-wrap items-center justify-between gap-2"
    >
      <span>
        {count.toLocaleString('fa-IR')} طرح اقساط در این بازه سررسید ندارد و نمایش داده نمی‌شود
      </span>
      <Button variant="secondary" size="sm" onClick={onShowAll}>
        نمایش همه
      </Button>
    </Alert>
  )
}
