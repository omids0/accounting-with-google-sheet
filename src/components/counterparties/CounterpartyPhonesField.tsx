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

type CounterpartyPhonesFieldProps = {
  control: Control<CounterpartyFormState>
  register: UseFormRegister<CounterpartyFormState>
}

export default function CounterpartyPhonesField({
  control,
  register
}: CounterpartyPhonesFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'phones'
  })

  return (
    <FormField label="شماره تماس">
      <div className={counterpartyFieldArrayListClass}>
        {fields.map((field, index) => (
          <div key={field.id} className={counterpartyFieldArrayItemClass}>
            <FormField label={`شماره ${(index + 1).toLocaleString('fa-IR')}`}>
              <input
                type="tel"
                {...register(`phones.${index}.number`)}
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
