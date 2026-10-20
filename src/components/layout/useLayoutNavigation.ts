import { useCallback, useEffect, useState, useTransition } from 'react'
import { useLocation, useNavigate } from 'react-router'

import {
  BUILDING_PARENT_TAB,
  CALCULATION_TABS,
  REPORT_TABS,
  SPEED_DIAL_TABS,
  TAB_TITLES,
  TIMESHEET_TABS,
  VEHICLE_TABS,
  WALLET_SUB_TABS,
  type Tab
} from './types'
import { useEngagementReminders } from '../../hooks/useEngagementReminders'
import { usePageSpeedDialConfig } from '../../hooks/usePageSpeedDial'
import { usePrefetchAppPages } from '../../hooks/usePrefetchAppPages'
import { useRegisterOverlay } from '../../hooks/useRegisterOverlay'
import { useIsBuildingWorkspace } from '../../hooks/useWorkspaceType'
import type { TabNavigationOptions } from '../../routes/paths'
import {
  getPathForTab,
  getTabFromPath,
  getSettingsSubpageTitle,
  isCloseYearPath,
  isSettingsPath,
  SETTINGS_PATH
} from '../../routes/paths'
import { prefetchTabPage, prefetchSecondaryAppPages } from '../../routes/prefetchPages'
import { getUserName, getUserPicture } from '../../services/auth'
import { useAppStore } from '../../stores/appStore'
import { useNavigationStore } from '../../stores/navigationStore'
import type { DashboardNavTarget } from '../../types'

/** Detail pages carry their header title in the navigation state. */
interface RouteTitleState {
  title?: string
}

const DETAIL_TITLE_TABS: Tab[] = [
  'timesheet-detail',
  'vehicle-detail',
  'dang-split-detail',
  'wallet-account-detail',
  'wallet-reconcile',
  'report-line-item'
]

export function useLayoutNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const isBuilding = useIsBuildingWorkspace()
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)
  const [menuOpen, setMenuOpen] = useState(false)
  const [calcMenuExpanded, setCalcMenuExpanded] = useState(false)
  const [reportsMenuExpanded, setReportsMenuExpanded] = useState(false)
  const [timesheetMenuExpanded, setTimesheetMenuExpanded] = useState(false)
  const [, startNavigationTransition] = useTransition()
  const [pendingTab, setPendingTab] = useState<Tab | null>(null)

  useRegisterOverlay(menuOpen, () => setMenuOpen(false))

  const routeTab = getTabFromPath(location.pathname)

  // The route change runs in a transition so the current page stays painted
  // instead of flashing the loading skeleton. Highlight the tapped tab right
  // away so the tap still feels instant.
  const tab = pendingTab ?? routeTab
  const showSettings = isSettingsPath(location.pathname)
  const routeTitle = (location.state as RouteTitleState | null)?.title

  const userName = getUserName()
  const userPicture = getUserPicture()
  const pageSpeedDialConfig = usePageSpeedDialConfig()

  useEngagementReminders()
  usePrefetchAppPages()

  const showPageSpeedDial =
    (!showSettings || tab === 'activity') &&
    SPEED_DIAL_TABS.includes(tab) &&
    pageSpeedDialConfig != null

  const handleTabChange = useCallback(
    (newTab: Tab, options?: TabNavigationOptions) => {
      prefetchTabPage(newTab)

      setMenuOpen(false)

      if (CALCULATION_TABS.includes(newTab)) {
        setCalcMenuExpanded(true)
      }
      if (REPORT_TABS.includes(newTab)) {
        setReportsMenuExpanded(true)
      }
      if (TIMESHEET_TABS.includes(newTab)) {
        setTimesheetMenuExpanded(true)
      }
      if (VEHICLE_TABS.includes(newTab)) {
        setMenuOpen(false)
      }

      const nextPath = getPathForTab(newTab, options)

      setPendingTab(newTab)

      const title =
        newTab === 'timesheet-detail'
          ? options?.timesheetTitle
          : newTab === 'vehicle-detail'
          ? options?.vehicleTitle
          : newTab === 'dang-split-detail'
          ? options?.dangSplitGroupTitle
          : newTab === 'report-line-item'
          ? options?.lineItemTitle
          : undefined

      startNavigationTransition(() => {
        navigate(nextPath, title ? { state: { title } } : undefined)
      })
    },
    [navigate]
  )

  useEffect(() => {
    setPendingTab(null)
  }, [location.pathname])

  const onNavigateDashboard = useCallback(
    (target: DashboardNavTarget) => {
      handleTabChange(target)
    },
    [handleTabChange]
  )

  const openTimesheetsList = useCallback(() => {
    setMenuOpen(false)
    setTimesheetMenuExpanded(true)
    navigate('/timesheets')
  }, [navigate])

  const openRecords = useCallback(
    (formType?: 'income' | 'expense') => {
      setMenuOpen(false)
      navigate(getPathForTab('records', { formType }))
    },
    [navigate]
  )

  const openEntry = useCallback(
    (formType?: 'income' | 'expense') => {
      setMenuOpen(false)
      navigate(getPathForTab('entry', { formType }))
    },
    [navigate]
  )

  const openSettings = useCallback(() => {
    setMenuOpen(false)
    navigate(SETTINGS_PATH)
  }, [navigate])

  useEffect(() => {
    useNavigationStore.getState().registerNavigation({
      onTabChange: handleTabChange,
      onOpenRecords: openRecords,
      onOpenEntry: openEntry,
      onNavigateDashboard
    })
  }, [handleTabChange, onNavigateDashboard, openEntry, openRecords])

  useEffect(() => {
    if (!menuOpen) return

    prefetchSecondaryAppPages()
  }, [menuOpen])

  const showHeaderBack =
    showSettings ||
    tab === 'charts' ||
    tab === 'records' ||
    tab === 'entry' ||
    tab === 'net-available-settings' ||
    tab === 'personal-reminders' ||
    tab === 'vehicle-service' ||
    tab === 'vehicle-detail' ||
    WALLET_SUB_TABS.includes(tab) ||
    tab === 'about' ||
    tab === 'search' ||
    tab in BUILDING_PARENT_TAB ||
    TIMESHEET_TABS.includes(tab) ||
    VEHICLE_TABS.includes(tab) ||
    CALCULATION_TABS.includes(tab) ||
    REPORT_TABS.includes(tab)

  const onHeaderBack = useCallback(() => {
    if (getSettingsSubpageTitle(location.pathname)) {
      // «بستن سال» returns to the year card or Settings, wherever it was opened from.
      if (isCloseYearPath(location.pathname) && location.key !== 'default') navigate(-1)
      // A building opens these tools from its own settings and goes back there.
      else navigate(isBuilding ? getPathForTab('building-settings') : SETTINGS_PATH)

      return
    }

    if (showSettings) {
      navigate('/')

      return
    }

    // Search returns to the page it was opened from.
    if (tab === 'search' && location.key !== 'default') {
      navigate(-1)

      return
    }

    if (tab === 'timesheet-detail') {
      handleTabChange('timesheets')

      return
    }

    if (tab === 'vehicle-detail') {
      handleTabChange('vehicle-service')

      return
    }

    if (tab === 'dang-split-detail') {
      handleTabChange('dang-split')

      return
    }

    if (tab === 'report-line-item') {
      handleTabChange('report-line-items')

      return
    }

    const [home, wallet]: Tab[] = isBuilding
      ? ['building-dashboard', 'building-fund']
      : ['dashboard', 'wallet']

    handleTabChange(BUILDING_PARENT_TAB[tab] ?? (WALLET_SUB_TABS.includes(tab) ? wallet : home))
  }, [handleTabChange, isBuilding, location.key, location.pathname, navigate, showSettings, tab])

  const isCalculationTab = CALCULATION_TABS.includes(tab)
  const isReportTab = REPORT_TABS.includes(tab)
  const isTimesheetTab = TIMESHEET_TABS.includes(tab)
  const isVehicleTab = VEHICLE_TABS.includes(tab)

  const settingsSubpageTitle = getSettingsSubpageTitle(location.pathname)

  const headerTitle = settingsSubpageTitle
    ? settingsSubpageTitle
    : showSettings
    ? 'تنظیمات'
    : DETAIL_TITLE_TABS.includes(tab) && routeTitle
    ? routeTitle
    : TAB_TITLES[tab]

  return {
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
    openRecords,
    openEntry,
    openSettings,
    showHeaderBack,
    onHeaderBack,
    isCalculationTab,
    isReportTab,
    isTimesheetTab,
    isVehicleTab,
    headerTitle
  }
}
