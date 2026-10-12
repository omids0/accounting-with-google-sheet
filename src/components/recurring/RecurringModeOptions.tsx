import { useId } from 'react'

import { RECURRING_CHOICES, type RecurringChoice } from '../../services/recurring'
import {
  recurringOptionClass,
  recurringOptionHintClass,
  recurringOptionsClass,
  recurringOptionTitleClass,
  recurringRadioClass
} from '../ui/recurringStyles'

/** «یادآوری + یک لمس» / «خودکار» / «بدون تکرار» as radio rows. */
export default function RecurringModeOptions({
  value,
  onChange,
  label = 'تکرار ماهانه'
}: {
  value: RecurringChoice
  onChange: (value: RecurringChoice) => void
  label?: string
}) {
  const labelId = useId()

  return (
    <div>
      <span id={labelId} className={recurringOptionTitleClass}>
        {label}
      </span>
      <div
        className={`${recurringOptionsClass} mt-1.5`}
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {RECURRING_CHOICES.map(choice => {
          const selected = value === choice.id

          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={recurringOptionClass(selected)}
              onClick={() => onChange(choice.id)}
            >
              <span className={recurringRadioClass(selected)} aria-hidden />
              <span>
                <span className={recurringOptionTitleClass}>{choice.title}</span>
                {choice.hint ? (
                  <span className={recurringOptionHintClass}>{choice.hint}</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
