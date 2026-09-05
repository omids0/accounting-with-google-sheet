import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useModalLock } from '../../../hooks/useModalLock'
import { cn } from '../../../utils/cn'
import AppIcon from '../../AppIcon'
import { categorySelectSheetPanelClass } from '../../ui/formControlStyles'
import {
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from '../../ui/modalStyles'

interface CategorySelectSheetProps {
  open: boolean
  title: string
  manageMode: boolean
  blocked?: boolean
  onClose: () => void
  onBackFromManage: () => void
  children: ReactNode
}

export default function CategorySelectSheet({
  open,
  title,
  manageMode,
  blocked = false,
  onClose,
  onBackFromManage,
  children
}: CategorySelectSheetProps) {
  const { panelRef } = useModalLock({ open, onClose, blocked })

  if (!open) return null

  return createPortal(
    <div
      className={cn(formModalRootClass, 'category-select-sheet')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-select-sheet-title"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={onClose}
        aria-label="بستن"
        disabled={blocked}
      />

      <div ref={panelRef} className={cn(formModalPanelClass, categorySelectSheetPanelClass)}>
        <div className={formModalHeaderClass}>
          <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-2">
            {manageMode && (
              <button
                type="button"
                className={formModalCloseClass}
                onClick={onBackFromManage}
                aria-label="بازگشت به انتخاب دسته"
                disabled={blocked}
              >
                <AppIcon name="back" size={18} strokeWidth={2} />
              </button>
            )}
            <h2 id="category-select-sheet-title" className={cn(formModalTitleClass, 'min-w-0')}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            aria-label="بستن"
            data-modal-close
            disabled={blocked}
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={cn(formModalBodyClass, 'flex min-h-0 flex-1 flex-col pt-3')}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
