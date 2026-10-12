import type { Ref } from 'react'

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
  inputRef?: Ref<HTMLInputElement>
  /** Enter in the field (the global search remembers the query). */
  onSubmit?: () => void
}

export default function PageSearchInput({
  value,
  onChange,
  placeholder = 'جستجو...',
  inputRef,
  onSubmit
}: PageSearchInputProps) {
  return (
    <div className={pageSearchClass}>
      {!value ? (
        <span className={pageSearchIconClass} aria-hidden="true">
          <AppIcon name="search" size={15} />
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        className={pageSearchInputClass}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onSubmit ? e => e.key === 'Enter' && onSubmit() : undefined}
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
          <AppIcon name="close" size={15} />
        </button>
      ) : null}
    </div>
  )
}
