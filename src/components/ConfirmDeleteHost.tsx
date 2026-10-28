import { useState, useSyncExternalStore } from 'react'

import ConfirmActionModal from './ConfirmActionModal'
import {
  answerConfirmDelete,
  confirmDeleteTitle,
  getConfirmDeleteRequest,
  subscribeConfirmDelete,
  type ConfirmDeleteRequest
} from '../utils/confirmDelete'

function ConfirmDeleteDialog({ request }: { request: ConfirmDeleteRequest }) {
  // Mounted per question (keyed by the request), so the checkbox starts from its default each time.
  const [checked, setChecked] = useState(Boolean(request.checkbox?.defaultChecked))

  return (
    <ConfirmActionModal
      open
      tone={request.wording?.tone ?? 'danger'}
      title={request.wording?.title ?? confirmDeleteTitle(request.label)}
      message={request.message}
      confirmLabel={request.wording?.confirmLabel ?? 'حذف'}
      cancelLabel="انصراف"
      checkbox={
        request.checkbox
          ? { label: request.checkbox.label, checked, onChange: setChecked }
          : undefined
      }
      onConfirm={() => answerConfirmDelete({ checked: Boolean(request.checkbox) && checked })}
      onClose={() => answerConfirmDelete(null)}
    />
  )
}

/** Shows the question `confirmDelete` opened; mount once at the app root. */
export default function ConfirmDeleteHost() {
  const request = useSyncExternalStore(subscribeConfirmDelete, getConfirmDeleteRequest)

  return request ? <ConfirmDeleteDialog key={request.id} request={request} /> : null
}
