import { formatPersianNumber } from '../utils/formatMoney'
import Button from './ui/Button'
import { recordsListCountClass } from './ui/recordsStyles'

/** «نمایش بیشتر (۵۰ مورد دیگر)» under a list driven by `useIncrementalList`; nothing when all rows show. */
export default function ShowMoreFooter({
  remaining,
  nextStep,
  onShowMore,
  unit = 'مورد',
  countLabel
}: {
  remaining: number
  nextStep: number
  onShowMore: () => void
  /** Noun after the number, e.g. «مورد» or «ردیف». */
  unit?: string
  /** «۵۰ از ۳۰۰ مورد» (`listCountLabel`), for lists without a count line of their own. */
  countLabel?: string
}) {
  if (remaining <= 0) return null

  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      {countLabel && <span className={recordsListCountClass}>{countLabel}</span>}
      <Button type="button" variant="secondary" size="sm" onClick={onShowMore}>
        نمایش بیشتر ({formatPersianNumber(nextStep)} {unit} دیگر)
      </Button>
    </div>
  )
}
