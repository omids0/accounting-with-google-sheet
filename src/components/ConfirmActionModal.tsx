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

type ConfirmActionModalProps = {
  open: boolean
  title: string
  message: string
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
  confirmLabel?: string
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirming = false,
  confirmLabel = 'بله'
}: ConfirmActionModalProps) {
  const { panelRef } = useModalLock({ open, onClose, blocked: confirming })

  if (!open) return null

  return createPortal(
    <div
      className={cn(formModalRootClass, 'confirm-action-modal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={() => {
          if (!confirming) onClose()
        }}
        aria-label="بستن"
      />

      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 id="confirm-action-title" className={formModalTitleClass}>
            {title}
          </h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            disabled={confirming}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={formModalBodyClass} aria-busy={confirming}>
          <p className={confirmDeleteMessageClass}>{message}</p>
        </div>

        <div className={cn(formModalActionsClass, formActionsClassName())}>
          {confirming && <span className={cn(spinnerClass, formModalSpinnerClass)} aria-hidden />}
          <Button type="button" variant="primary" disabled={confirming} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="secondary" disabled={confirming} onClick={onClose}>
            خیر
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
