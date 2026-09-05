import LayoutBottomNav from './LayoutBottomNav'
import LayoutHeader from './LayoutHeader'
import LayoutMenu from './LayoutMenu'
import LayoutPageOutlet from './LayoutPageOutlet'
import PageSpeedDial from '../PageSpeedDial'
import { useLayoutNavigation } from './useLayoutNavigation'
import { appLayoutClass, appMainClass } from '../ui/layoutStyles'

export default function Layout() {
  const {
    tab,
    spreadsheetKey,
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
    headerTitle
  } = useLayoutNavigation()

  return (
    <div className={appLayoutClass}>
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

      <main className={appMainClass}>
        <LayoutPageOutlet spreadsheetKey={spreadsheetKey} showSettings={showSettings} />
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
