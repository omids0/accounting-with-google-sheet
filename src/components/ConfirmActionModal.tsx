import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'
import { useModalLock } from '../hooks/useModalLock'
import { cn } from '../utils/cn'
import Button from './ui/Button'
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
  formModalTitleClass
} from './ui/modalStyles'

export type ConfirmCheckbox = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

type ConfirmActionModalProps = {
  open: boolean
  title: string
  message: string
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
  confirmLabel?: string
  cancelLabel?: string
  /** The cancel button is a second answer, not a close (✕ and the backdrop still close). */
  onCancel?: () => void
  /**
   * `danger`: the question is about deleting something. The cancel button is the bright one
   * (filled, red, big, first focus) and the confirm button is the quiet secondary one, so a
   * reflex tap cancels and deleting takes a conscious press.
   */
  tone?: 'default' | 'danger'
  /** An extra choice under the message, e.g. «رکوردهای مالی مرتبط هم حذف شوند». */
  checkbox?: ConfirmCheckbox
  /** Anything else under the message. */
  children?: ReactNode
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirming = false,
  confirmLabel = 'بله',
  cancelLabel = 'خیر',
  onCancel,
  tone = 'default',
  checkbox,
  children
}: ConfirmActionModalProps) {
  const { panelRef } = useModalLock({ open, onClose, blocked: confirming })
  const titleId = useId()

  if (!open) return null

  const danger = tone === 'danger'

  return createPortal(
    <div
      className={cn(formModalRootClass, 'confirm-action-modal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
          <h2 id={titleId} className={formModalTitleClass}>
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
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <div className={formModalBodyClass} aria-busy={confirming}>
          <p className={cn(confirmDeleteMessageClass, 'whitespace-pre-line')}>{message}</p>
          {checkbox ? (
            <label className="checkbox-row mt-3 flex items-start gap-2 text-[0.88rem] leading-[1.7]">
              <input
                type="checkbox"
                className="mt-1"
                checked={checkbox.checked}
                disabled={confirming}
                onChange={event => checkbox.onChange(event.target.checked)}
              />
              <span>{checkbox.label}</span>
            </label>
          ) : null}
          {children}
        </div>

        <div className={cn(formModalActionsClass, formActionsClassName())}>
          <Button
            type="button"
            variant={danger ? 'secondary' : 'primary'}
            disabled={confirming}
            loading={confirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? 'outflow' : 'secondary'}
            className={danger ? 'py-4 text-base' : undefined}
            disabled={confirming}
            onClick={onCancel ?? onClose}
            data-modal-initial-focus={danger ? true : undefined}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
