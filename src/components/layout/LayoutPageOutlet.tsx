import { memo, Suspense } from 'react'
import { Outlet } from 'react-router'

import RouteErrorBoundary from './RouteErrorBoundary'
import { AppLoadingSkeleton } from '../skeleton'
import { pageContentClass } from '../ui/layoutStyles'

interface LayoutPageOutletProps {
  spreadsheetKey: number
  showSettings: boolean
}

function LayoutPageOutlet({ spreadsheetKey, showSettings }: LayoutPageOutletProps) {
  return (
    <div key={showSettings ? 'settings' : String(spreadsheetKey)} className={pageContentClass}>
      <RouteErrorBoundary>
        <Suspense fallback={<AppLoadingSkeleton variant="inline" />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </div>
  )
}

export default memo(LayoutPageOutlet)
