import PageSpeedDial from '../PageSpeedDial'
import LayoutBottomNav from './LayoutBottomNav'
import LayoutContent from './LayoutContent'
import LayoutHeader from './LayoutHeader'
import LayoutMenu from './LayoutMenu'
import type { LayoutProps } from './types'
import { useLayoutNavigation } from './useLayoutNavigation'

export default function Layout({ onLogout, onReauth }: LayoutProps) {
  const {
    tab,
    dataKey,
    setDataKey,
    showSettings,
    menuOpen,
    setMenuOpen,
    calcMenuExpanded,
    setCalcMenuExpanded,
    reportsMenuExpanded,
    setReportsMenuExpanded,
    timesheetMenuExpanded,
    setTimesheetMenuExpanded,
    selectedTimesheet,
    recordsFormType,
    entryFormType,
    userName,
    userPicture,
    pageSpeedDialConfig,
    showPageSpeedDial,
    openTimesheetDetail,
    openTimesheetsList,
    handleTabChange,
    openRecords,
    openEntry,
    openSettings,
    showHeaderBack,
    isCalculationTab,
    isReportTab,
    isTimesheetTab,
    headerTitle
  } = useLayoutNavigation()

  return (
    <div className="app-layout">
      <LayoutHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(v => !v)}
        showHeaderBack={showHeaderBack}
        headerTitle={headerTitle}
        showSettings={showSettings}
        tab={tab}
        onTabChange={handleTabChange}
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
        onToggleReportsMenu={() => setReportsMenuExpanded(v => !v)}
        calcMenuExpanded={calcMenuExpanded}
        onToggleCalcMenu={() => setCalcMenuExpanded(v => !v)}
        timesheetMenuExpanded={timesheetMenuExpanded}
        onToggleTimesheetMenu={() => setTimesheetMenuExpanded(v => !v)}
        showSettings={showSettings}
        onTabChange={handleTabChange}
        onOpenSettings={openSettings}
        onOpenTimesheetsList={openTimesheetsList}
      />

      <LayoutContent
        showSettings={showSettings}
        onLogout={onLogout}
        onReauth={onReauth}
        dataKey={dataKey}
        onDataKeyChange={() => setDataKey(key => key + 1)}
        tab={tab}
        recordsFormType={recordsFormType}
        entryFormType={entryFormType}
        selectedTimesheet={selectedTimesheet}
        onTabChange={handleTabChange}
        onOpenRecords={openRecords}
        onOpenEntry={openEntry}
        onOpenTimesheetDetail={openTimesheetDetail}
      />

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
