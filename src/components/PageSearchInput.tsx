import AppIcon from './AppIcon'
import {
  pageSearchClass,
  pageSearchClearClass,
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
      {!value ? (
        <span className={pageSearchIconClass} aria-hidden="true">
          <AppIcon name="search" size={15} strokeWidth={2} />
        </span>
      ) : null}
      <input
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        className={pageSearchInputClass}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          className={pageSearchClearClass}
          onClick={() => onChange('')}
          aria-label="پاک کردن جستجو"
          tabIndex={-1}
        >
          <AppIcon name="close" size={15} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}
