import DateRangeFilter, {
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset
} from './DateRangeFilter'
import { CategoryFilterSelect, CounterpartyFilterSelect } from './form'
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
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
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
  counterparty?: string
  onCounterpartyChange?: (value: string) => void
  counterpartyOptions?: string[]
  counterpartyLabel?: string
  paymentStatus?: PaymentStatusFilter
  onPaymentStatusChange?: (value: PaymentStatusFilter) => void
  paymentStatusLabel?: string
  paymentStatusPaidLabel?: string
  paymentStatusUnpaidLabel?: string
  children?: React.ReactNode
}

export default function PageFilterPanel({
  search = '',
  onSearchChange,
  searchPlaceholder = 'جستجو...',
  showSearch = true,
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
  counterparty,
  onCounterpartyChange,
  counterpartyOptions,
  counterpartyLabel = 'طرف حساب',
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
      {showSearch && onSearchChange && (
        <div className={cn(pageFilterPanelSearchClass, pageFilterPanelSearchInputClass)}>
          <PageSearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

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

        {category !== undefined && onCategoryChange && categoryOptions !== undefined && (
          <div className={recordsFilterSectionClassName()}>
            <CategoryFilterSelect
              className={recordsCategorySelectClass}
              aria-label={categoryLabel}
              value={category}
              onChange={onCategoryChange}
              categories={categoryOptions}
            />
          </div>
        )}

        {counterparty !== undefined &&
          onCounterpartyChange &&
          counterpartyOptions !== undefined && (
            <div className={recordsFilterSectionClassName()}>
              <CounterpartyFilterSelect
                className={recordsCategorySelectClass}
                aria-label={counterpartyLabel}
                value={counterparty}
                onChange={onCounterpartyChange}
                counterparties={counterpartyOptions}
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
