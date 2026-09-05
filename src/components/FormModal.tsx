import { type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'
import { useModalLock } from '../hooks/useModalLock'
import { cn } from '../utils/cn'
import Button, { type ButtonVariant } from './ui/Button'
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

type FormModalProps = {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  saving?: boolean
  saveLabel: string
  saveButtonVariant?: ButtonVariant
  children: ReactNode
}

export default function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  saving = false,
  saveLabel,
  saveButtonVariant = 'primary',
  children
}: FormModalProps) {
  const { panelRef } = useModalLock({ open, onClose, blocked: saving })

  if (!open) return null

  return createPortal(
    <div
      className={formModalRootClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={() => {
          if (!saving) onClose()
        }}
        aria-label="بستن"
      />

      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 id="form-modal-title" className={formModalTitleClass}>
            {title}
          </h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            disabled={saving}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={onSubmit} aria-busy={saving}>
          <div className={formModalBodyClass}>{children}</div>

          <div className={cn(formModalActionsClass, formActionsClassName())}>
            {saving && <span className={cn('spinner', formModalSpinnerClass)} aria-hidden />}
            <Button type="submit" variant={saveButtonVariant} disabled={saving}>
              {saveLabel}
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
              انصراف
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
