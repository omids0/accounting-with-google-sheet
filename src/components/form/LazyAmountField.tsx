import { lazy, Suspense } from 'react'

import AmountInput from '../AmountInput'

// The dial pad is a building-workspace control: personal pages never download it.
const AmountField = lazy(() => import('../AmountField'))

interface LazyAmountFieldProps {
  value: string | number
  onChange: (value: number | '') => void
  label: string
  id?: string
  invalid?: boolean
}

/** `AmountField` loaded on demand; the typed `AmountInput` shows until it arrives. */
export default function LazyAmountField({
  value,
  onChange,
  label,
  id,
  invalid
}: LazyAmountFieldProps) {
  return (
    <Suspense fallback={<AmountInput value={value} onChange={onChange} invalid={invalid} />}>
      <AmountField value={value} onChange={onChange} label={label} id={id} invalid={invalid} />
    </Suspense>
  )
}
