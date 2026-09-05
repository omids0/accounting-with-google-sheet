import { memo, Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { AppLoadingSkeleton } from '../skeleton'
import { pageContentClass, pageContentTransitioningClass } from '../ui/layoutStyles'

interface LayoutPageOutletProps {
  spreadsheetKey: number
  showSettings: boolean
  isPageTransitioning: boolean
}

function LayoutPageOutlet({
  spreadsheetKey,
  showSettings,
  isPageTransitioning
}: LayoutPageOutletProps) {
  return (
    <div
      key={showSettings ? 'settings' : String(spreadsheetKey)}
      className={isPageTransitioning ? pageContentTransitioningClass : pageContentClass}
      aria-busy={isPageTransitioning}
    >
      <Suspense fallback={<AppLoadingSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  )
}

export default memo(LayoutPageOutlet)
