import { lazy, Suspense, useState } from 'react'

import SettleFields from './SettleFields'
import { useSettleFields } from './useSettleFields'
import type { SettleRequest } from './useSettleFlow'
import { readBridgePrefs } from '../../services/bridgePrefs'
import type { SettleOptions } from '../../services/settleOptions'
import FormModal from '../FormModal'
import { formHintClass } from '../ui/formStyles'

/** Building-only: loaded when a debt that was bridged to the personal sheet is settled. */
const BridgeSettleAccount = lazy(() => import('../buildings/BridgeSettleAccount'))

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
  const [bridgeAccount, setBridgeAccount] = useState(() => readBridgePrefs().account)

  return (
    <FormModal
      open
      variant="panel"
      title={request.title}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onSubmit({ ...state.commit(), ...(request.bridge ? { bridgeAccount } : {}) })
      }}
      saveLabel={state.linked ? 'وصل کن' : 'ثبت تسویه'}
      saveButtonVariant={request.type === 'expense' ? 'outflow' : 'inflow'}
    >
      {request.note ? <p className={formHintClass}>{request.note}</p> : null}
      <SettleFields state={state} type={request.type} />
      {request.bridge ? (
        <Suspense fallback={null}>
          <BridgeSettleAccount value={bridgeAccount} onChange={setBridgeAccount} />
        </Suspense>
      ) : null}
    </FormModal>
  )
}
