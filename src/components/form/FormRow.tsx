import type { ReactNode } from 'react'

import { cn } from '../../utils/cn'

type FormRowProps = {
  children: ReactNode
  className?: string
}

/** Place semantically related fields side-by-side on desktop only. */
export default function FormRow({ children, className }: FormRowProps) {
  return (
    <div
      className={cn(
        // The row owns the gap after its last field (children drop theirs), so
        // spacing below a row matches the spacing between standalone fields.
        'form-row mb-[var(--form-gap)] flex flex-col gap-[var(--form-gap)] last:mb-0',
        'lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4 lg:gap-y-[var(--form-gap)]',
        '[&>.form-field]:mb-0',
        '[&_.form-control-shell]:lg:max-w-none',
        className
      )}
    >
      {children}
    </div>
  )
}
