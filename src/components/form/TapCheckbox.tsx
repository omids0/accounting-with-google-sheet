import type { InputHTMLAttributes } from 'react'

import { cn } from '../../utils/cn'
import { dangCheckboxClass } from '../ui/featureCardStyles'

/**
 * The 44 px tap box around a list card's checkbox. Negative margins keep the card
 * layout as if only the small checkbox were there.
 */
export const tapCheckboxLabelClass =
  'relative z-[1] -mx-[0.7rem] -mb-[0.7rem] -mt-[0.6rem] inline-flex size-touch-min shrink-0 cursor-pointer items-center justify-center'

type TapCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** A list-card checkbox ("پرداخت شد", "تایید"…) inside a label that reaches 44x44 px. */
export default function TapCheckbox({ className, ...props }: TapCheckboxProps) {
  return (
    <label className={tapCheckboxLabelClass}>
      <input type="checkbox" className={cn(dangCheckboxClass, 'mt-0', className)} {...props} />
    </label>
  )
}
