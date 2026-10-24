import { useFieldArray, useFormState, type Control, type UseFormRegister } from 'react-hook-form'

import AppIcon from '../AppIcon'
import { phoneError } from './counterpartyFormPayload'
import {
  counterpartyFieldArrayActionsClass,
  counterpartyFieldArrayItemClass,
  counterpartyFieldArrayListClass
} from './counterpartyFormStyles'
import type { CounterpartyFormState } from './types'
import FormField from '../form/FormField'
import Button from '../ui/Button'

type CounterpartyPhonesFieldProps = {
  control: Control<CounterpartyFormState>
  register: UseFormRegister<CounterpartyFormState>
  /** Numbers already saved on the counterparty; they stay valid until edited. */
  savedNumbers?: readonly string[]
}

export default function CounterpartyPhonesField({
  control,
  register,
  savedNumbers
}: CounterpartyPhonesFieldProps) {
  const { errors } = useFormState({ control, name: 'phones' })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'phones'
  })

  return (
    <FormField label="شماره تماس" controlWidth="full">
      <div className={counterpartyFieldArrayListClass}>
        {fields.map((field, index) => (
          <div key={field.id} className={counterpartyFieldArrayItemClass}>
            <FormField
              label={`شماره ${(index + 1).toLocaleString('fa-IR')}`}
              error={errors.phones?.[index]?.number?.message}
            >
              <input
                type="tel"
                inputMode="tel"
                {...register(`phones.${index}.number`, {
                  validate: value => phoneError(value, savedNumbers)
                })}
                placeholder="09..."
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
                  aria-label={`حذف شماره ${(index + 1).toLocaleString('fa-IR')}`}
                >
                  <AppIcon name="trash" size={16} />
                </Button>
              </div>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ number: '' })}>
          + افزودن شماره
        </Button>
      </div>
    </FormField>
  )
}
