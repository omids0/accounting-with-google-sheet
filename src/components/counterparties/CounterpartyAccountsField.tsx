import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'

import AppIcon from '../AppIcon'
import { FormField } from '../form'
import {
  counterpartyFieldArrayActionsClass,
  counterpartyFieldArrayItemClass,
  counterpartyFieldArrayListClass
} from './counterpartyFormStyles'
import type { CounterpartyFormState } from './types'
import Button from '../ui/Button'

type CounterpartyAccountsFieldProps = {
  control: Control<CounterpartyFormState>
  register: UseFormRegister<CounterpartyFormState>
}

export default function CounterpartyAccountsField({
  control,
  register
}: CounterpartyAccountsFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'accounts'
  })

  return (
    <FormField label="لیست حساب‌ها">
      <div className={counterpartyFieldArrayListClass}>
        {fields.map((field, index) => (
          <div key={field.id} className={counterpartyFieldArrayItemClass}>
            <FormField label={`حساب ${(index + 1).toLocaleString('fa-IR')}`}>
              <input {...register(`accounts.${index}.bankName`)} placeholder="نام بانک" />
            </FormField>
            <FormField label="شماره حساب">
              <input
                {...register(`accounts.${index}.accountNumber`)}
                placeholder="شماره حساب"
                dir="ltr"
              />
            </FormField>
            {fields.length > 1 ? (
              <div className={counterpartyFieldArrayActionsClass}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => remove(index)}
                  aria-label={`حذف حساب ${(index + 1).toLocaleString('fa-IR')}`}
                >
                  <AppIcon name="trash" size={16} />
                </Button>
              </div>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ bankName: '', accountNumber: '' })}
        >
          + افزودن حساب
        </Button>
      </div>
    </FormField>
  )
}
