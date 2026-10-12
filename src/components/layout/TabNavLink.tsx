import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { Link } from 'react-router'

import type { Tab } from './types'
import { getPathForTab } from '../../routes/paths'
import { prefetchTabPageOnIntent } from '../../routes/prefetchPages'

type TabNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  /** Route tab; resolves `to` and warms the page chunk when the pointer or a finger lands on it. */
  tab?: Tab
  /** Explicit path for destinations that are not tabs (e.g. settings). */
  to?: string
  active?: boolean
  /** In-app navigation for a plain click (keeps transitions, menu closing, etc.). */
  onNavigate: () => void
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * A real link for app navigation: middle-click / open in new tab work and screen
 * readers announce it as a link, while a plain click still goes through the
 * layout's own navigation handler.
 */
export default function TabNavLink({
  tab,
  to,
  active = false,
  onNavigate,
  onPointerEnter,
  children,
  ...rest
}: TabNavLinkProps) {
  return (
    <Link
      to={to ?? (tab ? getPathForTab(tab) : '/')}
      aria-current={active ? 'page' : undefined}
      // Pointer enter fires on mouse hover and on touch contact, ahead of pointerdown.
      onPointerEnter={event => {
        if (tab) prefetchTabPageOnIntent(tab)
        onPointerEnter?.(event)
      }}
      onClick={event => {
        if (!isPlainLeftClick(event)) return

        event.preventDefault()
        onNavigate()
      }}
      {...rest}
    >
      {children}
    </Link>
  )
}
