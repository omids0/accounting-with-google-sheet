import RecordDetailSheet from './RecordDetailSheet'
import RecordsEditFormModal from './RecordsEditFormModal'
import type { useRecordDetail } from './useRecordDetail'
import type { useRecordsPage } from './useRecordsPage'
import ConfirmActionModal from '../ConfirmActionModal'
import SharedDeleteChoiceSheet from '../shared/SharedDeleteChoiceSheet'

/**
 * The record detail sheet, the edit form and the questions a records list can ask (repeat amount,
 * receipts, unit shares, back-dated entry). Shared by the records page and a building's expenses.
 */
export default function RecordsPageOverlays({
  page,
  detail,
  readOnly = false
}: {
  page: ReturnType<typeof useRecordsPage>
  detail: ReturnType<typeof useRecordDetail>
  readOnly?: boolean
}) {
  const detailForm = detail.record
    ? page.forms.find(form => form.id === detail.record?.formId)
    : undefined

  return (
    <>
      {detail.record && detailForm && (
        <RecordDetailSheet
          record={detail.record}
          form={detailForm}
          readOnly={readOnly}
          onClose={detail.close}
          onEdit={record => {
            detail.close()
            page.openEditForm(record)
          }}
          onDelete={record => {
            detail.close()
            page.requestDelete(record)
          }}
        />
      )}

      {page.editingForm && page.editingRecord && (
        <RecordsEditFormModal
          open={page.showForm}
          editingForm={page.editingForm}
          editingRecord={page.editingRecord}
          saving={page.saving}
          onClose={page.closeForm}
          onSubmit={page.handleSubmit}
          recurringChoice={page.recurring.enabled ? page.recurring.choice : undefined}
          onRecurringChoiceChange={page.recurring.setChoice}
          attachments={page.attachments}
        />
      )}

      <ConfirmActionModal {...page.amountQuestionModal} />
      <ConfirmActionModal {...page.attachmentQuestionModal} />
      <ConfirmActionModal {...page.shareQuestionModal} />
      <SharedDeleteChoiceSheet {...page.sharedDeleteSheet} />

      <ConfirmActionModal
        open={page.retroactiveWarning.open}
        title={page.retroactiveWarning.title}
        message={page.retroactiveWarning.message}
        confirming={page.retroactiveWarning.confirming}
        confirmLabel={page.retroactiveWarning.confirmLabel}
        onClose={page.retroactiveWarning.cancel}
        onConfirm={page.retroactiveWarning.confirm}
      />
    </>
  )
}
