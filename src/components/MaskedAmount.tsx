import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

import { useAmountReveal, useIsAmountsHidden } from '../hooks/useAmountsHidden'
import {
  AMOUNT_MASK_LABEL,
  AMOUNT_REVEAL_HINT,
  maskDots,
  maskWidthClass,
  type AmountMaskSize
} from '../utils/amountMask'
import { cn, cx } from '../utils/cn'

const maskBaseClass = 'inline-block text-center tracking-[0.12em]'

const maskRevealClass = cx(
  'cursor-pointer select-none rounded-sm',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
)

/**
 * Wraps any rendered amount: as-is normally, «•••••» while hidden mode is on.
 * A tap (or Enter / Space) shows that one amount for five seconds. The tap is
 * kept from reaching a clickable card around it.
 */
export default function MaskedAmount({
  children,
  size = 'text',
  className,
  mask,
  revealable = true
}: {
  children: ReactNode
  size?: AmountMaskSize
  /** Classes of the mask; pass the amount's own classes so its size does not change. */
  className?: string
  /** Custom mask content (`MoneyDisplay` keeps its value/unit layout); dots by default. */
  mask?: ReactNode
  /** Off inside tooltips and other places that cannot take a tap. */
  revealable?: boolean
}) {
  const hidden = useIsAmountsHidden()
  const { revealed, reveal } = useAmountReveal()

  if (!hidden || revealed) return children

  const content = mask ?? <span aria-hidden="true">{maskDots(size)}</span>

  if (!revealable) {
    return (
      <span
        className={cn(maskBaseClass, className, maskWidthClass(size))}
        role="img"
        aria-label={AMOUNT_MASK_LABEL}
      >
        {content}
      </span>
    )
  }

  const onClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    reveal()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    reveal()
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(maskBaseClass, maskRevealClass, className, maskWidthClass(size))}
      aria-label={`${AMOUNT_MASK_LABEL} — ${AMOUNT_REVEAL_HINT}`}
      title={AMOUNT_REVEAL_HINT}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-amount-mask=""
    >
      {content}
    </span>
  )
}
