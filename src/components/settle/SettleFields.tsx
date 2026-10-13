import SettleDuplicateCard from './SettleDuplicateCard'
import type { SettleFieldsState } from './useSettleFields'
import { WALLET_APPLY_FIELD_LABEL, WALLET_APPLY_NO, WALLET_APPLY_YES } from '../form/fieldUtils'
import FormField from '../form/FormField'
import Select from '../form/Select'
import WalletAccountSelect from '../form/WalletAccountSelect'
import JalaliDatePicker from '../JalaliDatePicker'

/**
 * The settle answers as form fields: the duplicate card, «تاریخ پرداخت», «از حساب» (or «به حساب»)
 * and «اثر بر موجودی». Shared by the settle sheet and the receivable payment forms.
 */
export default function SettleFields({
  state,
  type
}: {
  state: SettleFieldsState
  type: 'expense' | 'income'
}) {
  return (
    <>
      {state.duplicate ? (
        <SettleDuplicateCard
          text={state.duplicateText}
          linked={state.linked}
          onLink={state.link}
          onDismiss={state.dismiss}
        />
      ) : null}

      {state.linked ? null : (
        <>
          <FormField label="تاریخ پرداخت" controlWidth="full">
            <JalaliDatePicker value={state.date} onChange={state.setDate} />
          </FormField>
          <FormField
            label={type === 'expense' ? 'از حساب' : 'به حساب'}
            hint="آخرین انتخاب شما · «بدون حساب» = فقط رکورد"
            controlWidth="full"
          >
            <WalletAccountSelect value={state.account} onChange={state.setAccount} />
          </FormField>
          {state.account ? (
            <FormField label={WALLET_APPLY_FIELD_LABEL} controlWidth="full">
              <Select
                value={state.apply}
                onChange={state.setApply}
                aria-label={WALLET_APPLY_FIELD_LABEL}
                options={[
                  { value: WALLET_APPLY_YES, label: WALLET_APPLY_YES },
                  { value: WALLET_APPLY_NO, label: WALLET_APPLY_NO }
                ]}
              />
            </FormField>
          ) : null}
        </>
      )}
    </>
  )
}
