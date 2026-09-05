import type { ListSortOption, SortDirection } from '../hooks/useListSort'
import {
  recordsDateGridBtnClass,
  recordsDateGridClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName,
  recordsSortDirectionGridClass
} from './ui/recordsStyles'
import { cn } from '../utils/cn'

interface ListSortSectionProps<T extends string> {
  options: ListSortOption<T>[]
  sortId: T
  onSortIdChange: (value: T) => void
  sortDirection: SortDirection
  onSortDirectionChange: (value: SortDirection) => void
  label?: string
}

const DIRECTION_OPTIONS: { id: SortDirection; label: string }[] = [
  { id: 'asc', label: 'صعودی' },
  { id: 'desc', label: 'نزولی' }
]

export default function ListSortSection<T extends string>({
  options,
  sortId,
  onSortIdChange,
  sortDirection,
  onSortDirectionChange,
  label = 'مرتب‌سازی'
}: ListSortSectionProps<T>) {
  return (
    <div className={recordsFilterSectionClassName()}>
      <span className={recordsFilterLabelClass}>{label}</span>
      <div className={recordsDateGridClass}>
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            className={recordsDateGridBtnClass(sortId === option.id)}
            onClick={() => {
              onSortIdChange(option.id)
              onSortDirectionChange(option.defaultDirection)
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={cn(recordsDateGridClass, recordsSortDirectionGridClass)}>
        {DIRECTION_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            className={recordsDateGridBtnClass(sortDirection === option.id)}
            onClick={() => onSortDirectionChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
