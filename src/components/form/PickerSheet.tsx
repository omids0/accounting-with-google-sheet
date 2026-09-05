import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useModalLock } from '../../hooks/useModalLock'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import { pickerSheetPanelClass } from '../ui/datePickerStyles'
import {
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from '../ui/modalStyles'

interface PickerSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  subtitle?: ReactNode
}

export default function PickerSheet({
  open,
  title,
  onClose,
  children,
  footer,
  subtitle
}: PickerSheetProps) {
  const { panelRef } = useModalLock({ open, onClose })

  if (!open) return null

  return createPortal(
    <div
      className={cn(formModalRootClass, 'picker-sheet')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-sheet-title"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={onClose}
        aria-label="بستن"
      />

      <div ref={panelRef} className={cn(formModalPanelClass, pickerSheetPanelClass)}>
        <div className={formModalHeaderClass}>
          <div className="col-start-1 row-start-2 min-w-0">
            <h2 id="picker-sheet-title" className={formModalTitleClass}>
              {title}
            </h2>
            {subtitle}
          </div>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={cn(formModalBodyClass, 'flex min-h-0 flex-1 flex-col gap-3 pt-3')}>
          {children}
        </div>

        {footer}
      </div>
    </div>,
    document.body
  )
}
