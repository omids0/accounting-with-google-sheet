import { useCallback, useEffect, useState } from 'react'

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
import { getUserName, getUserPicture } from '../../services/auth'
import type { Timesheet } from '../../types'

export function useLayoutNavigation() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dataKey, setDataKey] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [calcMenuExpanded, setCalcMenuExpanded] = useState(false)
  const [reportsMenuExpanded, setReportsMenuExpanded] = useState(false)
  const [timesheetMenuExpanded, setTimesheetMenuExpanded] = useState(false)
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null)
  const [recordsFormType, setRecordsFormType] = useState<'income' | 'expense' | undefined>()
  const [entryFormType, setEntryFormType] = useState<'income' | 'expense' | undefined>()

  const userName = getUserName()
  const userPicture = getUserPicture()
  const pageSpeedDialConfig = usePageSpeedDialConfig()

  useEngagementReminders()

  const showPageSpeedDial =
    !showSettings && SPEED_DIAL_TABS.includes(tab) && pageSpeedDialConfig != null

  const openTimesheetDetail = useCallback((timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet)
    setTimesheetMenuExpanded(true)
    setShowSettings(false)
    setMenuOpen(false)
    setTab('timesheet-detail')
  }, [])

  const openTimesheetsList = useCallback(() => {
    setShowSettings(false)
    setMenuOpen(false)
    setTimesheetMenuExpanded(true)
    setTab('timesheets')
  }, [])

  const handleTabChange = useCallback((newTab: Tab) => {
    setShowSettings(false)
    setMenuOpen(false)
    if (newTab !== 'records') setRecordsFormType(undefined)
    if (newTab !== 'entry') setEntryFormType(undefined)
    if (CALCULATION_TABS.includes(newTab)) {
      setCalcMenuExpanded(true)
    }
    if (REPORT_TABS.includes(newTab)) {
      setReportsMenuExpanded(true)
    }
    if (TIMESHEET_TABS.includes(newTab)) {
      setTimesheetMenuExpanded(true)
    }
    if (newTab === 'timesheets') {
      setSelectedTimesheet(null)
    }
    setTab(newTab)
  }, [])

  const openRecords = useCallback((formType?: 'income' | 'expense') => {
    setShowSettings(false)
    setMenuOpen(false)
    setRecordsFormType(formType)
    setTab('records')
  }, [])

  const openEntry = useCallback((formType?: 'income' | 'expense') => {
    setShowSettings(false)
    setMenuOpen(false)
    setEntryFormType(formType)
    setTab('entry')
  }, [])

  const openSettings = () => {
    setShowSettings(true)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const showHeaderBack =
    !showSettings &&
    (tab === 'records' ||
      tab === 'entry' ||
      tab === 'opening-balances' ||
      tab === 'net-available-settings' ||
      tab === 'about' ||
      TIMESHEET_TABS.includes(tab) ||
      CALCULATION_TABS.includes(tab) ||
      REPORT_TABS.includes(tab))

  const isCalculationTab = CALCULATION_TABS.includes(tab)
  const isReportTab = REPORT_TABS.includes(tab)
  const isTimesheetTab = TIMESHEET_TABS.includes(tab)

  const headerTitle = showSettings
    ? 'تنظیمات'
    : tab === 'timesheet-detail' && selectedTimesheet
    ? selectedTimesheet.title
    : TAB_TITLES[tab]

  return {
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
  }
}
