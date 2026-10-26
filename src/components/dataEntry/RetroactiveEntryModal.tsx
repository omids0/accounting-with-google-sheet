import type { useRetroactiveEntryWarning } from '../../hooks/useRetroactiveEntryWarning'
import ConfirmActionModal from '../ConfirmActionModal'

/** «ثبت برای ماه گذشته»: asks before an entry is written into a past month. */
export default function RetroactiveEntryModal({
  warning
}: {
  warning: ReturnType<typeof useRetroactiveEntryWarning>
}) {
  return (
    <ConfirmActionModal
      open={warning.open}
      title={warning.title}
      message={warning.message}
      confirming={warning.confirming}
      confirmLabel={warning.confirmLabel}
      onClose={warning.cancel}
      onConfirm={warning.confirm}
    />
  )
}
