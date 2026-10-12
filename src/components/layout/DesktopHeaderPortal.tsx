import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { type HeaderSlots, useHeaderSlots } from './headerSlots'
import { useIsDesktop } from '../../hooks/useMediaQuery'

/**
 * Renders its children in the desktop header (≥ 1280px) and in place below
 * that, so one element serves both layouts (period chip, filters, actions).
 */
export default function DesktopHeaderPortal({
  slot = 'toolbar',
  children
}: {
  slot?: keyof HeaderSlots
  children: ReactNode
}) {
  const isDesktop = useIsDesktop()
  const target = useHeaderSlots()[slot]

  if (!isDesktop) return children

  return target ? createPortal(children, target) : null
}
