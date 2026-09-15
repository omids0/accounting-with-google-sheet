import ConfirmActionModal from './ConfirmActionModal'

type AppUpdateModalProps = {
  open: boolean
  applying: boolean
  onApply: () => void
  onDismiss: () => void
}

export default function AppUpdateModal({
  open,
  applying,
  onApply,
  onDismiss
}: AppUpdateModalProps) {
  return (
    <ConfirmActionModal
      open={open}
      title="بروزرسانی اپ"
      message="نسخه جدید اپ آماده است. می‌خواهید الان بروزرسانی شود یا بعداً انجام دهید؟"
      confirming={applying}
      confirmLabel="بروزرسانی"
      cancelLabel="بعداً"
      onConfirm={onApply}
      onClose={onDismiss}
    />
  )
}
