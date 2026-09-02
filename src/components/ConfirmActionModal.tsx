import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'

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
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, confirming, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="form-modal confirm-action-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <button
        type="button"
        className="form-modal-backdrop"
        onClick={() => {
          if (!confirming) onClose()
        }}
        aria-label="بستن"
      />

      <div className="form-modal-panel">
        <div className="form-modal-header">
          <h2 id="confirm-action-title" className="form-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="form-modal-close"
            onClick={onClose}
            disabled={confirming}
            aria-label="بستن"
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="form-modal-body">
          <p className="confirm-delete-message">{message}</p>
        </div>

        <div className="form-actions form-modal-actions">
          {confirming && <span className="spinner form-modal-spinner" aria-hidden />}
          <button
            type="button"
            className="btn btn-primary"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={confirming}
            onClick={onClose}
          >
            خیر
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
