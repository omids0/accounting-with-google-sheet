import AppIcon from './AppIcon'
import {
  pageSearchClass,
  pageSearchIconClass,
  pageSearchInputClass
} from './ui/filterControlStyles'

interface PageSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function PageSearchInput({
  value,
  onChange,
  placeholder = 'جستجو...'
}: PageSearchInputProps) {
  return (
    <div className={pageSearchClass}>
      <span className={pageSearchIconClass} aria-hidden="true">
        <AppIcon name="search" size={15} strokeWidth={2} />
      </span>
      <input
        type="search"
        className={pageSearchInputClass}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="page-search-clear"
          onClick={() => onChange('')}
          aria-label="پاک کردن جستجو"
        >
          <AppIcon name="close" size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
