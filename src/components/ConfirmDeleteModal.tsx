import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'
import { useModalLock } from '../hooks/useModalLock'
import { cn } from '../utils/cn'
import Button from './ui/Button'
import { spinnerClass } from './ui/displayStyles'
import { confirmDeleteMessageClass } from './ui/featureCardStyles'
import { formActionsClassName } from './ui/formStyles'
import {
  formModalActionsClass,
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalSpinnerClass,
  formModalTitleClass
} from './ui/modalStyles'

type ConfirmDeleteModalProps = {
  open: boolean
  title?: string
  message: string
  onClose: () => void
  onConfirm: () => void
  deleting?: boolean
}

export default function ConfirmDeleteModal({
  open,
  title = 'تأیید حذف',
  message,
  onClose,
  onConfirm,
  deleting = false
}: ConfirmDeleteModalProps) {
  const { panelRef } = useModalLock({ open, onClose, blocked: deleting })

  if (!open) return null

  return createPortal(
    <div
      className={cn(formModalRootClass, 'confirm-delete-modal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
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
          <h2 id="confirm-delete-title" className={formModalTitleClass}>
            {title}
          </h2>
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

        <div className={formModalBodyClass} aria-busy={deleting}>
          <p className={confirmDeleteMessageClass}>{message}</p>
        </div>

        <div className={cn(formModalActionsClass, formActionsClassName())}>
          {deleting && <span className={cn(spinnerClass, formModalSpinnerClass)} aria-hidden />}
          <Button type="button" variant="danger" disabled={deleting} onClick={onConfirm}>
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
