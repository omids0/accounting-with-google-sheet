import type { ListSortOption, SortDirection } from '../hooks/useListSort'

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
    <div className="records-filter-section">
      <span className="records-filter-label">{label}</span>
      <div className="records-date-grid">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            className={sortId === option.id ? 'active' : ''}
            onClick={() => {
              onSortIdChange(option.id)
              onSortDirectionChange(option.defaultDirection)
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="records-date-grid records-sort-direction-grid">
        {DIRECTION_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            className={sortDirection === option.id ? 'active' : ''}
            onClick={() => onSortDirectionChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
