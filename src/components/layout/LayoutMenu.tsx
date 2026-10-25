import { useRef } from 'react'

import LayoutBuildingMenuNav from './LayoutBuildingMenuNav'
import LayoutMenuFooter from './LayoutMenuFooter'
import LayoutMenuNav, { type LayoutMenuNavProps } from './LayoutMenuNav'
import LayoutMenuRail from './LayoutMenuRail'
import LayoutMenuUserRow from './LayoutMenuUserRow'
import LayoutSharedMenuNav from './LayoutSharedMenuNav'
import { useActiveSpreadsheetName } from '../../hooks/useActiveSpreadsheetName'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useScrollActiveIntoView } from '../../hooks/useScrollActiveIntoView'
import { useWorkspaceType } from '../../hooks/useWorkspaceType'
import { cn } from '../../utils/cn'
import {
  appMenuBackdropClass,
  appMenuDrawerClass,
  appMenuScrollBodyClass,
  type AppMenuVariant
} from '../ui/layoutStyles'

interface LayoutMenuProps extends LayoutMenuNavProps {
  /**
   * `drawer` overlays the page while open; `rail` (tablet) is an icon column that
   * opens the drawer for labels and groups; `sidebar` (desktop) stays open.
   */
  variant: AppMenuVariant
  menuOpen: boolean
  onOpenMenu: () => void
  onCloseMenu: () => void
  userName: string | null
  userPicture: string | null
}

export default function LayoutMenu(props: LayoutMenuProps) {
  const { variant, menuOpen, onOpenMenu, onCloseMenu, userName, userPicture, ...navProps } = props
  const sheetName = useActiveSpreadsheetName()
  const workspace = useWorkspaceType()
  const navRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // The open drawer focuses the current page's link and hands focus back to ☰
  // (or the tablet rail button) on close.
  useFocusTrap(variant === 'drawer' && menuOpen, navRef, '[aria-current="page"]')

  // The last group (settings, about) can sit below the fold on a short window.
  useScrollActiveIntoView(
    scrollRef,
    variant === 'sidebar' || (variant === 'drawer' && menuOpen),
    `${navProps.tab}:${navProps.showSettings}`
  )

  if (variant === 'rail') {
    return (
      <>
        <LayoutMenuRail {...navProps} menuOpen={menuOpen} onOpenMenu={onOpenMenu} />
        {menuOpen && <LayoutMenu {...props} variant="drawer" />}
      </>
    )
  }

  const isDrawer = variant === 'drawer'
  const isVisible = !isDrawer || menuOpen

  return (
    <>
      {isDrawer && menuOpen && (
        <button
          type="button"
          className={appMenuBackdropClass}
          onClick={onCloseMenu}
          aria-label="بستن منو"
        />
      )}
      <nav
        ref={navRef}
        className={cn(appMenuDrawerClass(variant), !isVisible && 'hidden')}
        aria-label="منوی اصلی"
      >
        <LayoutMenuUserRow
          variant={variant}
          userName={userName}
          userPicture={userPicture}
          sheetName={sheetName}
        />
        <div ref={scrollRef} className={appMenuScrollBodyClass}>
          {workspace === 'building' ? (
            <LayoutBuildingMenuNav
              tab={navProps.tab}
              showSettings={navProps.showSettings}
              onTabChange={navProps.onTabChange}
              onCloseMenu={onCloseMenu}
            />
          ) : workspace === 'shared' ? (
            <LayoutSharedMenuNav
              tab={navProps.tab}
              showSettings={navProps.showSettings}
              onTabChange={navProps.onTabChange}
              onCloseMenu={onCloseMenu}
            />
          ) : (
            <LayoutMenuNav {...navProps} />
          )}
        </div>
        <LayoutMenuFooter sheetName={sheetName} />
      </nav>
    </>
  )
}
