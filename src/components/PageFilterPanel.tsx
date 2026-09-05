import DateRangeFilter, {
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset
} from './DateRangeFilter'
import { Select } from './form'
import PageSearchInput from './PageSearchInput'
import {
  pageFilterPanelClass,
  pageFilterPanelSearchClass,
  pageFilterPanelSearchInputClass,
  pageFilterPanelSectionsClass
} from './ui/filterControlStyles'
import {
  recordsCategorySelectClass,
  recordsDateGridBtnClass,
  recordsDateGridClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName
} from './ui/recordsStyles'
import { cn } from '../utils/cn'

export type PaymentStatusFilter = 'all' | 'paid' | 'unpaid'

const PAYMENT_STATUS_OPTIONS: { id: PaymentStatusFilter; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'paid', label: 'پرداخت شده' },
  { id: 'unpaid', label: 'پرداخت نشده' }
]

interface PageFilterPanelProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  datePreset?: DateRangeFilterPreset
  customRange?: AppliedDateRangeFilter['customRange']
  onDateFilterChange?: (filter: AppliedDateRangeFilter) => void
  dateIncludeAll?: boolean
  dateLabel?: string
  dateLoading?: boolean
  category?: string
  onCategoryChange?: (value: string) => void
  categoryOptions?: string[]
  categoryLabel?: string
  paymentStatus?: PaymentStatusFilter
  onPaymentStatusChange?: (value: PaymentStatusFilter) => void
  paymentStatusLabel?: string
  paymentStatusPaidLabel?: string
  paymentStatusUnpaidLabel?: string
  children?: React.ReactNode
}

export default function PageFilterPanel({
  search,
  onSearchChange,
  searchPlaceholder = 'جستجو...',
  datePreset,
  customRange,
  onDateFilterChange,
  dateIncludeAll,
  dateLabel = 'بازه زمانی',
  dateLoading,
  category,
  onCategoryChange,
  categoryOptions,
  categoryLabel = 'دسته‌بندی',
  paymentStatus,
  onPaymentStatusChange,
  paymentStatusLabel = 'وضعیت پرداخت',
  paymentStatusPaidLabel,
  paymentStatusUnpaidLabel,
  children
}: PageFilterPanelProps) {
  const paymentOptions = PAYMENT_STATUS_OPTIONS.map(option => {
    if (option.id === 'paid' && paymentStatusPaidLabel) {
      return { ...option, label: paymentStatusPaidLabel }
    }
    if (option.id === 'unpaid' && paymentStatusUnpaidLabel) {
      return { ...option, label: paymentStatusUnpaidLabel }
    }

    return option
  })

  return (
    <div className={pageFilterPanelClass}>
      <div className={cn(pageFilterPanelSearchClass, pageFilterPanelSearchInputClass)}>
        <PageSearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      </div>

      <div className={pageFilterPanelSectionsClass}>
        {paymentStatus !== undefined && onPaymentStatusChange && (
          <div className={recordsFilterSectionClassName()}>
            <span className={recordsFilterLabelClass}>{paymentStatusLabel}</span>
            <div className={recordsDateGridClass}>
              {paymentOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={recordsDateGridBtnClass(paymentStatus === option.id)}
                  onClick={() => onPaymentStatusChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {category !== undefined &&
          onCategoryChange &&
          categoryOptions &&
          categoryOptions.length > 0 && (
            <div className={recordsFilterSectionClassName(true)}>
              <span className={recordsFilterLabelClass}>{categoryLabel}</span>
              <Select
                className={recordsCategorySelectClass}
                compact
                aria-label={categoryLabel}
                value={category}
                onChange={onCategoryChange}
                options={[
                  { value: 'all', label: 'همه' },
                  ...categoryOptions.map(item => ({ value: item, label: item }))
                ]}
              />
            </div>
          )}

        {datePreset !== undefined && customRange && onDateFilterChange && (
          <DateRangeFilter
            preset={datePreset}
            customRange={customRange}
            onChange={onDateFilterChange}
            loading={dateLoading}
            includeAll={dateIncludeAll}
            label={dateLabel}
          />
        )}

        {children}
      </div>
    </div>
  )
}
