import type { ChildMonth } from './useChildMonth'
import PeriodStepper from '../PeriodStepper'

/** «مهر ۱۴۰۵» with the previous / next month buttons (never past the current month). */
export default function ChildMonthBar({ month }: { month: ChildMonth }) {
  return (
    <div className="flex justify-center">
      <PeriodStepper
        label={month.label}
        onPrevious={month.previous}
        onNext={month.next}
        previousLabel="ماه قبل"
        nextLabel="ماه بعد"
        nextDisabled={!month.canNext}
      />
    </div>
  )
}
