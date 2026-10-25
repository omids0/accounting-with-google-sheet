import { formatPersianNumber } from '../utils/formatMoney'
import Button from './ui/Button'

/** «نمایش بیشتر (۵۰ مورد دیگر)» under a list driven by `useIncrementalList`; nothing when all rows show. */
export default function ShowMoreFooter({
  remaining,
  nextStep,
  onShowMore,
  unit = 'مورد'
}: {
  remaining: number
  nextStep: number
  onShowMore: () => void
  /** Noun after the number, e.g. «مورد» or «ردیف». */
  unit?: string
}) {
  if (remaining <= 0) return null

  return (
    <div className="flex justify-center py-3">
      <Button type="button" variant="secondary" size="sm" onClick={onShowMore}>
        نمایش بیشتر ({formatPersianNumber(nextStep)} {unit} دیگر)
      </Button>
    </div>
  )
}
