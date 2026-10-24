import type { InputHTMLAttributes } from 'react'

import { cn } from '../../utils/cn'
import { dangCheckboxClass } from '../ui/featureCardStyles'

/**
 * The 44 px tap box around a list card's checkbox. Negative margins on the outer start side
 * and above/below (card padding, no controls there) keep the layout tight; the inner side has
 * none, so the box never reaches the card body's own tap area.
 */
export const tapCheckboxLabelClass =
  'relative z-[1] -ms-[0.7rem] -mb-[0.7rem] -mt-[0.6rem] inline-flex size-touch-min shrink-0 cursor-pointer items-center justify-center'

type TapCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** A list-card checkbox ("پرداخت شد", "تایید"…) inside a label that reaches 44x44 px. */
export default function TapCheckbox({ className, ...props }: TapCheckboxProps) {
  return (
    <label className={tapCheckboxLabelClass}>
      <input type="checkbox" className={cn(dangCheckboxClass, 'mt-0', className)} {...props} />
    </label>
  )
}
