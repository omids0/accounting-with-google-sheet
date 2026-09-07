import {
  getRecordAmount,
  summarizeFilteredRecords,
  sumFilteredRecordAmounts,
  type StoredRecord
} from './recordsUtils'
import type { CustomForm } from '../../types'
import { distributionSparkline } from '../../utils/sparklineData'
import StatCard from '../StatCard'
import { dashboardFlowSectionClass } from '../ui/chartStyles'
import {
  recordsSummaryHintClass,
  recordsSummarySectionClass,
  recordsSummaryTotalCardClass
} from '../ui/recordsStyles'

interface RecordsSummaryProps {
  filteredRecords: StoredRecord[]
  forms: CustomForm[]
  activeForm?: CustomForm
  isAllForms: boolean
  showFilteredLabel: boolean
}

function singleFormSummaryLabel(form: CustomForm | undefined): string {
  if (form?.type === 'income') return 'مجموع درآمد'
  if (form?.type === 'expense') return 'مجموع هزینه'

  return 'مجموع'
}

export default function RecordsSummary({
  filteredRecords,
  forms,
  activeForm,
  isAllForms,
  showFilteredLabel
}: RecordsSummaryProps) {
  if (!filteredRecords.length) return null

  if (isAllForms) {
    const totals = summarizeFilteredRecords(filteredRecords, forms)

    const incomeAmounts = filteredRecords
      .filter(record => forms.find(form => form.id === record.formId)?.type === 'income')
      .map(record => getRecordAmount(record, forms))

    const expenseAmounts = filteredRecords
      .filter(record => forms.find(form => form.id === record.formId)?.type === 'expense')
      .map(record => getRecordAmount(record, forms))

    const netDirection =
      totals.net < 0 ? 'negative' : totals.net > 0 ? 'positive' : ('neutral' as const)

    return (
      <section className={recordsSummarySectionClass} aria-label="خلاصه رکوردهای فیلتر شده">
        {showFilteredLabel && (
          <p className={recordsSummaryHintClass}>خلاصه بر اساس فیلترهای فعال</p>
        )}

        <div className={dashboardFlowSectionClass}>
          <StatCard
            label="درآمد"
            amount={totals.income}
            variant="income"
            sparklineData={distributionSparkline(incomeAmounts)}
            animateIndex={0}
            lift
          />
          <StatCard
            label="هزینه"
            amount={totals.expense}
            variant="expense"
            sparklineData={distributionSparkline(expenseAmounts)}
            animateIndex={1}
            lift
          />
          <StatCard
            label="مانده"
            amount={totals.net}
            variant="flow"
            wide
            flowDirection={netDirection}
            sparklineData={distributionSparkline([totals.income, totals.expense, totals.net])}
            animateIndex={2}
            lift
          />
        </div>
      </section>
    )
  }

  const total = sumFilteredRecordAmounts(filteredRecords, forms, activeForm)

  const variant =
    activeForm?.type === 'income'
      ? 'income'
      : activeForm?.type === 'expense'
      ? 'expense'
      : 'default'

  return (
    <section className={recordsSummarySectionClass} aria-label="خلاصه رکوردهای فیلتر شده">
      {showFilteredLabel && <p className={recordsSummaryHintClass}>خلاصه بر اساس فیلترهای فعال</p>}

      <StatCard
        label={singleFormSummaryLabel(activeForm)}
        amount={total}
        variant={variant}
        wide
        sparklineData={distributionSparkline(
          filteredRecords.map(record => getRecordAmount(record, forms))
        )}
        className={recordsSummaryTotalCardClass}
      />
    </section>
  )
}
