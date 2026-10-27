import ConfirmActionModal from './ConfirmActionModal'

type ConfirmDeleteModalProps = {
  open: boolean
  title?: string
  message: string
  onClose: () => void
  onConfirm: () => void
  deleting?: boolean
  /** Defaults to «حذف». */
  confirmLabel?: string
  /** Defaults to «انصراف». */
  cancelLabel?: string
}

/** A delete question with a busy state: `ConfirmActionModal` in its `danger` tone. */
export default function ConfirmDeleteModal({
  title = 'تأیید حذف',
  deleting = false,
  confirmLabel = 'حذف',
  cancelLabel = 'انصراف',
  ...props
}: ConfirmDeleteModalProps) {
  return (
    <ConfirmActionModal
      {...props}
      tone="danger"
      title={title}
      confirming={deleting}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
    />
  )
}
