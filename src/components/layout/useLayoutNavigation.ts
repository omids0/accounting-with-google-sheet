import { useCallback, useEffect, useState, useTransition } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  CALCULATION_TABS,
  REPORT_TABS,
  SPEED_DIAL_TABS,
  TAB_TITLES,
  TIMESHEET_TABS,
  type Tab
} from './types'
import { useEngagementReminders } from '../../hooks/useEngagementReminders'
import { usePageSpeedDialConfig } from '../../hooks/usePageSpeedDial'
import { usePrefetchAppPages } from '../../hooks/usePrefetchAppPages'
import type { TabNavigationOptions } from '../../routes/paths'
import {
  getPathForTab,
  getTabFromPath,
  isSettingsPath,
  isSettingsRemindersPath,
  SETTINGS_PATH
} from '../../routes/paths'
import { prefetchTabPage, prefetchSecondaryAppPages } from '../../routes/prefetchPages'
import { getUserName, getUserPicture } from '../../services/auth'
import { useAppStore } from '../../stores/appStore'
import { useNavigationStore } from '../../stores/navigationStore'
import type { DashboardNavTarget } from '../../types'

interface TimesheetRouteState {
  title?: string
}

export function useLayoutNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)
  const [menuOpen, setMenuOpen] = useState(false)
  const [calcMenuExpanded, setCalcMenuExpanded] = useState(false)
  const [reportsMenuExpanded, setReportsMenuExpanded] = useState(false)
  const [timesheetMenuExpanded, setTimesheetMenuExpanded] = useState(false)
  const [, startNavigationTransition] = useTransition()
  const [pendingTab, setPendingTab] = useState<Tab | null>(null)

  const routeTab = getTabFromPath(location.pathname)

  // The route change runs in a transition so the current page stays painted
  // instead of flashing the loading skeleton. Highlight the tapped tab right
  // away so the tap still feels instant.
  const tab = pendingTab ?? routeTab
  const showSettings = isSettingsPath(location.pathname)
  const timesheetTitle = (location.state as TimesheetRouteState | null)?.title

  const userName = getUserName()
  const userPicture = getUserPicture()
  const pageSpeedDialConfig = usePageSpeedDialConfig()

  useEngagementReminders()
  usePrefetchAppPages()

  const showPageSpeedDial =
    !showSettings && SPEED_DIAL_TABS.includes(tab) && pageSpeedDialConfig != null

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

      const nextPath = getPathForTab(newTab, options)

      setPendingTab(newTab)

      startNavigationTransition(() => {
        if (newTab === 'timesheet-detail' && options?.timesheetTitle) {
          navigate(nextPath, { state: { title: options.timesheetTitle } })

          return
        }

        navigate(nextPath)
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

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const showHeaderBack =
    showSettings ||
    tab === 'records' ||
    tab === 'entry' ||
    tab === 'opening-balances' ||
    tab === 'net-available-settings' ||
    tab === 'about' ||
    TIMESHEET_TABS.includes(tab) ||
    CALCULATION_TABS.includes(tab) ||
    REPORT_TABS.includes(tab)

  const onHeaderBack = useCallback(() => {
    if (isSettingsRemindersPath(location.pathname)) {
      navigate(SETTINGS_PATH)

      return
    }

    if (showSettings) {
      navigate('/')

      return
    }

    if (tab === 'timesheet-detail') {
      handleTabChange('timesheets')

      return
    }

    handleTabChange(tab === 'opening-balances' ? 'wallet' : 'dashboard')
  }, [handleTabChange, location.pathname, navigate, showSettings, tab])

  const isCalculationTab = CALCULATION_TABS.includes(tab)
  const isReportTab = REPORT_TABS.includes(tab)
  const isTimesheetTab = TIMESHEET_TABS.includes(tab)

  const headerTitle = isSettingsRemindersPath(location.pathname)
    ? 'یادآوری‌ها'
    : showSettings
    ? 'تنظیمات'
    : tab === 'timesheet-detail' && timesheetTitle
    ? timesheetTitle
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
    headerTitle
  }
}
