import { memo, Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { AppLoadingSkeleton } from '../skeleton'
import { pageContentClass } from '../ui/layoutStyles'

interface LayoutPageOutletProps {
  spreadsheetKey: number
  showSettings: boolean
}

function LayoutPageOutlet({ spreadsheetKey, showSettings }: LayoutPageOutletProps) {
  return (
    <div key={showSettings ? 'settings' : String(spreadsheetKey)} className={pageContentClass}>
      <Suspense fallback={<AppLoadingSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  )
}

export default memo(LayoutPageOutlet)
