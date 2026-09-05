import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import PageSpeedDial from '../PageSpeedDial'
import { AppLoadingSkeleton } from '../skeleton'
import LayoutBottomNav from './LayoutBottomNav'
import LayoutHeader from './LayoutHeader'
import LayoutMenu from './LayoutMenu'
import type { LayoutProps } from './types'
import { useLayoutNavigation } from './useLayoutNavigation'

export default function Layout({ onLogout, onReauth }: LayoutProps) {
  const {
    tab,
    dataKey,
    showSettings,
    menuOpen,
    setMenuOpen,
    calcMenuExpanded,
    setCalcMenuExpanded,
    reportsMenuExpanded,
    setReportsMenuExpanded,
    timesheetMenuExpanded,
    setTimesheetMenuExpanded,
    userName,
    userPicture,
    pageSpeedDialConfig,
    showPageSpeedDial,
    openTimesheetsList,
    handleTabChange,
    openSettings,
    showHeaderBack,
    onHeaderBack,
    isCalculationTab,
    isReportTab,
    isTimesheetTab,
    headerTitle,
    outletContext
  } = useLayoutNavigation({ onLogout, onReauth })

  return (
    <div className="app-layout">
      <LayoutHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(value => !value)}
        showHeaderBack={showHeaderBack}
        headerTitle={headerTitle}
        showSettings={showSettings}
        onHeaderBack={onHeaderBack}
      />

      <LayoutMenu
        menuOpen={menuOpen}
        onCloseMenu={() => setMenuOpen(false)}
        userName={userName}
        userPicture={userPicture}
        tab={tab}
        isReportTab={isReportTab}
        isCalculationTab={isCalculationTab}
        isTimesheetTab={isTimesheetTab}
        reportsMenuExpanded={reportsMenuExpanded}
        onToggleReportsMenu={() => setReportsMenuExpanded(value => !value)}
        calcMenuExpanded={calcMenuExpanded}
        onToggleCalcMenu={() => setCalcMenuExpanded(value => !value)}
        timesheetMenuExpanded={timesheetMenuExpanded}
        onToggleTimesheetMenu={() => setTimesheetMenuExpanded(value => !value)}
        showSettings={showSettings}
        onTabChange={handleTabChange}
        onOpenSettings={openSettings}
        onOpenTimesheetsList={openTimesheetsList}
      />

      <main className="app-main">
        <div key={showSettings ? 'settings' : String(dataKey)} className="page-content">
          <Suspense fallback={<AppLoadingSkeleton />}>
            <Outlet context={outletContext} />
          </Suspense>
        </div>
      </main>

      <LayoutBottomNav showSettings={showSettings} tab={tab} onTabChange={handleTabChange} />

      {showPageSpeedDial && pageSpeedDialConfig && (
        <PageSpeedDial
          actions={pageSpeedDialConfig.actions}
          ariaLabel={pageSpeedDialConfig.ariaLabel}
        />
      )}
    </div>
  )
}
