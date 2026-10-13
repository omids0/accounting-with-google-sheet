import { type FormEvent, type ReactNode, useId } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'
import { useModalLock } from '../hooks/useModalLock'
import { cn } from '../utils/cn'
import Button, { type ButtonVariant } from './ui/Button'
import { formActionsClassName } from './ui/formStyles'
import { lineItemsBlockedHintClass } from './ui/lineItemStyles'
import {
  formModalActionsClass,
  formModalBackdropClass,
  formModalBackdropPanelClass,
  formModalBodyClass,
  formModalFieldsLayoutClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalPanelSideClass,
  formModalPanelWideClass,
  formModalRootClass,
  formModalRootPanelClass,
  formModalTitleClass
} from './ui/modalStyles'

type FormModalProps = {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  saving?: boolean
  /** Locks the save button without the busy state (e.g. line items that do not add up). */
  saveDisabled?: boolean
  /** Why saving is locked; shown under the buttons. */
  saveHint?: string
  saveLabel: string
  saveButtonVariant?: ButtonVariant
  size?: 'default' | 'wide'
  /** `panel`: a side panel on desktop (list pages); the same sheet below 1280px. */
  variant?: 'modal' | 'panel'
  /** The second button; with `onCancel` it is a second answer, not a close. */
  cancelLabel?: string
  onCancel?: () => void
  children: ReactNode
}

export default function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  saving = false,
  saveDisabled = false,
  saveHint,
  saveLabel,
  saveButtonVariant = 'primary',
  size = 'default',
  variant = 'modal',
  cancelLabel = 'انصراف',
  onCancel,
  children
}: FormModalProps) {
  const isPanel = variant === 'panel'
  const { panelRef } = useModalLock({ open, onClose, blocked: saving })
  const titleId = useId()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation()
    onSubmit(event)
  }

  if (!open) return null

  return createPortal(
    <div
      className={cn(formModalRootClass, isPanel && formModalRootPanelClass)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={cn(formModalBackdropClass, isPanel && formModalBackdropPanelClass)}
        onClick={() => {
          if (!saving) onClose()
        }}
        aria-label="بستن"
      />

      <div
        ref={panelRef}
        className={cn(
          formModalPanelClass,
          size === 'wide' && formModalPanelWideClass,
          isPanel && formModalPanelSideClass
        )}
      >
        <div className={formModalHeaderClass}>
          <h2 id={titleId} className={formModalTitleClass}>
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
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} aria-busy={saving}>
          <div className={cn(formModalBodyClass, formModalFieldsLayoutClass)}>{children}</div>

          <div className={cn(formModalActionsClass, formActionsClassName())}>
            <Button
              type="submit"
              variant={saveButtonVariant}
              disabled={saving || saveDisabled}
              loading={saving}
            >
              {saveLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={onCancel ?? onClose}
            >
              {cancelLabel}
            </Button>
          </div>
          {saveHint ? (
            <p className={lineItemsBlockedHintClass} role="status">
              {saveHint}
            </p>
          ) : null}
        </form>
      </div>
    </div>,
    document.body
  )
}
