import { useId } from 'react'
import { createPortal } from 'react-dom'

import type { VehicleDeleteTarget } from './types'
import { useModalLock } from '../../hooks/useModalLock'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import { confirmDeleteMessageClass } from '../ui/featureCardStyles'
import { formActionsClassName } from '../ui/formStyles'
import {
  formModalActionsClass,
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from '../ui/modalStyles'

type VehicleItemDeleteModalProps = {
  open: boolean
  target: VehicleDeleteTarget | null
  deleteLinkedExpense: boolean
  onDeleteLinkedExpenseChange: (value: boolean) => void
  onClose: () => void
  onConfirm: () => void
}

export default function VehicleItemDeleteModal({
  open,
  target,
  deleteLinkedExpense,
  onDeleteLinkedExpenseChange,
  onClose,
  onConfirm
}: VehicleItemDeleteModalProps) {
  const { panelRef } = useModalLock({ open, onClose })
  const titleId = useId()

  if (!open || !target) return null

  const expenseId = target.item.expenseRecordId

  return createPortal(
    <div
      className={cn(formModalRootClass, 'vehicle-item-delete-modal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={onClose}
        aria-label="بستن"
      />

      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 id={titleId} className={formModalTitleClass}>
            تأیید حذف
          </h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <div className={formModalBodyClass}>
          <p className={confirmDeleteMessageClass}>از حذف این مورد مطمئن هستید؟</p>
          {expenseId ? (
            <label className="checkbox-row mt-3 flex items-center gap-2 text-[0.85rem]">
              <input
                type="checkbox"
                checked={deleteLinkedExpense}
                onChange={event => onDeleteLinkedExpenseChange(event.target.checked)}
              />
              <span>حذف هزینه مرتبط در رکوردها</span>
            </label>
          ) : null}
        </div>

        <div className={cn(formModalActionsClass, formActionsClassName())}>
          <Button type="button" variant="danger" onClick={onConfirm}>
            بله
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} data-modal-initial-focus>
            خیر
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
