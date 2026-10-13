import SettleSheet from './SettleSheet'
import type { SettleFlow } from './useSettleFlow'
import ConfirmActionModal from '../ConfirmActionModal'

/** The settle sheet and the «رکورد وصل‌شده هم حذف شود؟» question of a page. */
export default function SettleFlowModals({ flow }: { flow: SettleFlow }) {
  return (
    <>
      {flow.settle ? (
        <SettleSheet
          request={flow.settle.request}
          onSubmit={flow.answerSettle}
          onClose={() => flow.answerSettle(null)}
        />
      ) : null}
      <ConfirmActionModal
        open={Boolean(flow.unlink)}
        title="رکورد وصل‌شده"
        message="رکورد وصل‌شده هم حذف شود؟"
        confirmLabel="حذف"
        cancelLabel="نه، فقط جدا کن"
        onClose={() => flow.answerUnlink(null)}
        onConfirm={() => flow.answerUnlink('delete')}
        onCancel={() => flow.answerUnlink('keep')}
      />
    </>
  )
}
