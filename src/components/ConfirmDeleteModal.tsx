import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import AppIcon from './AppIcon'

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
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, deleting, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="form-modal confirm-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <button
        type="button"
        className="form-modal-backdrop"
        onClick={() => {
          if (!deleting) onClose()
        }}
        aria-label="بستن"
      />

      <div className="form-modal-panel">
        <div className="form-modal-header">
          <h2 id="confirm-delete-title" className="form-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="form-modal-close"
            onClick={onClose}
            disabled={deleting}
            aria-label="بستن"
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="form-modal-body">
          <p className="confirm-delete-message">{message}</p>
        </div>

        <div className="form-actions form-modal-actions">
          {deleting && <span className="spinner form-modal-spinner" aria-hidden />}
          <button type="button" className="btn btn-danger" disabled={deleting} onClick={onConfirm}>
            بله
          </button>
          <button type="button" className="btn btn-secondary" disabled={deleting} onClick={onClose}>
            خیر
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
