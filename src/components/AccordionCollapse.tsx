import { useEffect, useState, type ReactNode, type TransitionEvent } from 'react'

import {
  accordionCollapseClass,
  accordionCollapseInnerClass,
  accordionCollapseOpenClass,
  accordionCollapsePaymentsClass,
  accordionCollapsePaymentsOpenClass
} from './ui/datePickerStyles'
import { cn } from '../utils/cn'

type AccordionCollapseProps = {
  open: boolean
  children: ReactNode
  className?: string
}

export function AccordionCollapse({ open, children, className = '' }: AccordionCollapseProps) {
  const [mounted, setMounted] = useState(open)

  const [visible, setVisible] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)

      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })

      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)

    return undefined
  }, [open])

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (!open && event.propertyName === 'grid-template-rows') {
      setMounted(false)
    }
  }

  if (!mounted) return null

  return (
    <div
      className={cn(accordionCollapseClass, visible && accordionCollapseOpenClass, className)}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        className={cn(
          accordionCollapseInnerClass,
          accordionCollapsePaymentsClass,
          visible && accordionCollapsePaymentsOpenClass
        )}
      >
        {children}
      </div>
    </div>
  )
}
