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
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function VehicleItemDeleteModal({
  open,
  target,
  deleteLinkedExpense,
  onDeleteLinkedExpenseChange,
  deleting,
  onClose,
  onConfirm
}: VehicleItemDeleteModalProps) {
  const { panelRef } = useModalLock({ open, onClose, blocked: deleting })

  if (!open || !target) return null

  const expenseId = target.item.expenseRecordId

  return createPortal(
    <div
      className={cn(formModalRootClass, 'vehicle-item-delete-modal')}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={() => {
          if (!deleting) onClose()
        }}
        aria-label="بستن"
      />

      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 className={formModalTitleClass}>تأیید حذف</h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            disabled={deleting}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
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
                disabled={deleting}
              />
              <span>حذف هزینه مرتبط در رکوردها</span>
            </label>
          ) : null}
        </div>

        <div className={cn(formModalActionsClass, formActionsClassName())}>
          <Button
            type="button"
            variant="danger"
            disabled={deleting}
            loading={deleting}
            onClick={onConfirm}
          >
            بله
          </Button>
          <Button type="button" variant="secondary" disabled={deleting} onClick={onClose}>
            خیر
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
