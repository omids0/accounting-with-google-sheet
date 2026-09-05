import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'
import { cn } from '../utils/cn'
import Button from './ui/Button'
import { formActionsClassName } from './ui/formStyles'
import {
  formModalActionsClass,
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from './ui/modalStyles'

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
      className={cn(formModalRootClass, 'filter-modal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={onClose}
        aria-label="بستن"
      />

      <div className={cn(formModalPanelClass, 'filter-modal-panel')}>
        <div className={formModalHeaderClass}>
          <h2 id="filter-modal-title" className={formModalTitleClass}>
            {title}
          </h2>
          <button type="button" className={formModalCloseClass} onClick={onClose} aria-label="بستن">
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={cn(formModalBodyClass, 'filter-modal-body')}>{children}</div>

        <div className={cn(formModalActionsClass, formActionsClassName(), 'filter-modal-actions')}>
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
