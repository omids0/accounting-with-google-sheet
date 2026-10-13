import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useIsDesktop } from '../../hooks/useMediaQuery'
import { getPathForTab, getTabFromPath } from '../../routes/paths'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import { headerIconBtnMenuClass } from '../ui/layoutStyles'
import { headerSearchChipClass, headerSearchKbdClass } from '../ui/searchStyles'

/** `location.state` that asks the search page to focus its input. */
export interface SearchFocusState {
  focusSearch: number
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

/** Opens `/search`, or refocuses its input when it is already open. */
export function useOpenSearch(): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  const onSearch = getTabFromPath(location.pathname) === 'search'

  return useCallback(() => {
    const state: SearchFocusState = { focusSearch: Date.now() }

    navigate(getPathForTab('search'), { state, replace: onSearch })
  }, [navigate, onSearch])
}

/** Desktop: `/` or Ctrl+K (⌘K) opens or focuses the search, unless typing in a field. */
function useSearchShortcut(openSearch: () => void) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!isDesktop) return

    const onKeyDown = (event: KeyboardEvent) => {
      const isSlash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
      const isCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

      if (!isSlash && !isCtrlK) return
      if (isTypingTarget(event.target) || document.querySelector('[aria-modal="true"]')) return

      event.preventDefault()
      openSearch()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, openSearch])
}

/** ⌕ in the phone/tablet header's end cell. */
export function HeaderSearchButton() {
  const openSearch = useOpenSearch()

  return (
    <button
      type="button"
      className={cn(headerIconBtnMenuClass(false), 'xl:hidden')}
      onClick={openSearch}
      aria-label="جستجو"
      title="جستجو"
    >
      <AppIcon name="search" size={19} />
    </button>
  )
}

/** «جستجو ⌕» in the desktop header, with the keyboard shortcut. */
export function HeaderSearchChip() {
  const openSearch = useOpenSearch()

  useSearchShortcut(openSearch)

  return (
    <button
      type="button"
      className={headerSearchChipClass}
      onClick={openSearch}
      aria-keyshortcuts="/ Control+K"
      title="جستجو (/ یا Ctrl+K)"
    >
      <AppIcon name="search" size={15} />
      جستجو
      <kbd className={headerSearchKbdClass}>Ctrl K</kbd>
    </button>
  )
}
