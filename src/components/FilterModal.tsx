import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'
import Button from './ui/Button'

interface FilterModalProps {
  open: boolean
  title?: string
  onClose: () => void
  onApply: () => void
  onClear?: () => void
  children: ReactNode
}

export default function FilterModal({
  open,
  title = 'فیلتر',
  onClose,
  onApply,
  onClear,
  children
}: FilterModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="form-modal filter-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <button type="button" className="form-modal-backdrop" onClick={onClose} aria-label="بستن" />

      <div className="form-modal-panel filter-modal-panel">
        <div className="form-modal-header">
          <h2 id="filter-modal-title" className="form-modal-title">
            {title}
          </h2>
          <button type="button" className="form-modal-close" onClick={onClose} aria-label="بستن">
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="form-modal-body filter-modal-body">{children}</div>

        <div className="form-actions form-modal-actions filter-modal-actions">
          {onClear && (
            <Button
              type="button"
              variant="secondary"
              className="filter-modal-clear"
              onClick={onClear}
            >
              پاک کردن
            </Button>
          )}
          <Button type="button" variant="primary" onClick={onApply}>
            اعمال فیلتر
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
