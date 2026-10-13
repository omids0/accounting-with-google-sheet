import SettleFields from './SettleFields'
import { useSettleFields } from './useSettleFields'
import type { SettleRequest } from './useSettleFlow'
import type { SettleOptions } from '../../services/settleOptions'
import FormModal from '../FormModal'

/** «تسویه»: date, account and balance effect of a payment, with a catch for one already recorded. */
export default function SettleSheet({
  request,
  onSubmit,
  onClose
}: {
  request: SettleRequest
  onSubmit: (options: SettleOptions) => void
  onClose: () => void
}) {
  const state = useSettleFields({
    type: request.type,
    amount: request.amount,
    linkedIds: request.linkedIds,
    defaultDate: request.date
  })

  return (
    <FormModal
      open
      variant="panel"
      title={request.title}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onSubmit(state.commit())
      }}
      saveLabel={state.linked ? 'وصل کن' : 'ثبت تسویه'}
      saveButtonVariant={request.type === 'expense' ? 'outflow' : 'inflow'}
    >
      <SettleFields state={state} type={request.type} />
    </FormModal>
  )
}
