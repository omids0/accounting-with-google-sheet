import type { CustomForm } from '../../types'
import { formatDateRangeLabel, type RecordsDatePreset } from '../../utils/dateRange'
import DateRangeFilter from '../DateRangeFilter'
import type { AppliedDateRangeFilter } from '../DateRangeFilter'
import { Select } from '../form'
import TransactionTypeSegment, { transactionTypeOptionsFromForms } from '../TransactionTypeSegment'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface RecordsToolbarProps {
  dateRange: { start: string; end: string }
  loading: boolean
  forms: CustomForm[]
  activeFormId: string
  datePreset: RecordsDatePreset
  customRange: { start: string; end: string }
  showCategoryFilter: boolean
  categoryFilter: string
  categoryOptions: string[]
  onRefresh: () => void
  onFormChange: (formId: string) => void
  onDateFilterChange: (filter: AppliedDateRangeFilter) => void
  onCategoryChange: (value: string) => void
}

export default function RecordsToolbar({
  dateRange,
  loading,
  forms,
  activeFormId,
  datePreset,
  customRange,
  showCategoryFilter,
  categoryFilter,
  categoryOptions,
  onRefresh,
  onFormChange,
  onDateFilterChange,
  onCategoryChange
}: RecordsToolbarProps) {
  return (
    <Card className="records-toolbar">
      <div className="records-toolbar-header">
        <div className="records-toolbar-heading">
          <h2 className="records-toolbar-title">تراکنش‌ها</h2>
          <p className="records-toolbar-range">{formatDateRangeLabel(dateRange)}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="records-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="بارگذاری مجدد"
        >
          {loading ? '...' : '↻'}
        </Button>
      </div>

      <TransactionTypeSegment
        options={transactionTypeOptionsFromForms(forms, { includeAll: true })}
        value={activeFormId}
        onChange={onFormChange}
      />

      <DateRangeFilter
        preset={datePreset}
        customRange={customRange}
        onChange={onDateFilterChange}
        loading={loading}
      />

      {showCategoryFilter && (
        <div className="records-filter-section records-filter-section--inline">
          <span className="records-filter-label">دسته‌بندی</span>
          <Select
            className="records-category-select"
            compact
            aria-label="دسته‌بندی"
            value={categoryFilter}
            onChange={onCategoryChange}
            options={[
              { value: 'all', label: 'همه' },
              ...categoryOptions.map(cat => ({ value: cat, label: cat }))
            ]}
          />
        </div>
      )}
    </Card>
  )
}
