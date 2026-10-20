import { useEffect, useMemo, useState } from 'react'

import { useBuildingSetupData, type BuildingSetupData } from './useBuildingSetupData'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  dangToManager,
  loadMonthFlow,
  monthToIssue,
  type MonthFlow
} from '../../services/buildingDashboard'
import { getManagedList, MANAGER_PAYER } from '../../services/buildingLists'
import { buildingUpcoming } from '../../services/buildingUpcoming'
import { fetchChecks } from '../../services/checks'
import { getCounterpartyFullName } from '../../services/counterparties'
import { fetchDangs } from '../../services/dang'
import type { DashboardReminderItem } from '../../services/dashboardReminders'
import { fetchRecurringItems } from '../../services/recurringSheet'
import { collectCheckDueItems } from '../../services/reports'
import { getSettings } from '../../services/settings'
import type { Dang, RecurringItem } from '../../types'
import { addDaysToIso, getTodayIso } from '../../utils/jalaliDate'

/** Checks due within this many days show under «پیش رو». */
const HORIZON_DAYS = 30

interface Extras {
  flow: MonthFlow
  dangs: Dang[]
  recurring: RecurringItem[]
  checks: ReturnType<typeof collectCheckDueItems>
}

const NO_EXTRAS: Extras = {
  flow: { income: 0, expense: 0, expenseCount: 0 },
  dangs: [],
  recurring: [],
  checks: []
}

export interface BuildingDashboardData extends BuildingSetupData {
  flow: MonthFlow
  /** Unpaid debt of the building to the manager (payer «مدیر» or a `me` person). */
  owedToManager: number
  upcoming: DashboardReminderItem[]
  /** The month the «صدور نشده» card asks to issue, if any. */
  monthToIssue: string | null
}

/**
 * Everything the building dashboard shows: the setup data (units, stays, people, receivables,
 * accounts, profile) plus this month's flow, the building's dang, checks and recurring items.
 */
export function useBuildingDashboard(): BuildingDashboardData {
  const data = useBuildingSetupData()
  const revision = useDataRefresh()
  const [extras, setExtras] = useState(NO_EXTRAS)

  useEffect(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    let live = true
    const today = getTodayIso().slice(0, 10)

    void Promise.all([
      loadMonthFlow(settings),
      fetchDangs(settings.spreadsheetId).catch(() => []),
      fetchRecurringItems(settings.spreadsheetId),
      fetchChecks(settings.spreadsheetId).catch(() => [])
    ]).then(([flow, dangs, recurring, checks]) => {
      if (live) {
        setExtras({
          flow,
          dangs,
          recurring,
          checks: collectCheckDueItems(
            checks,
            today,
            addDaysToIso(today, HORIZON_DAYS).slice(0, 10)
          )
        })
      }
    })

    return () => {
      live = false
    }
  }, [revision])

  const { profile, units, persons, receivables } = data

  const managerNames = useMemo(
    () => [
      getManagedList('EXPENSE_PAYERS').find(item => item.value === MANAGER_PAYER)?.label ?? '',
      ...persons.filter(person => person.me).map(getCounterpartyFullName)
    ],
    [persons]
  )

  const upcoming = useMemo(
    () =>
      profile
        ? buildingUpcoming({
            profile,
            units,
            recurring: extras.recurring,
            checks: extras.checks,
            todayIso: getTodayIso().slice(0, 10)
          })
        : [],
    [profile, units, extras.recurring, extras.checks]
  )

  return {
    ...data,
    flow: extras.flow,
    owedToManager: dangToManager(extras.dangs, managerNames),
    upcoming,
    monthToIssue: profile ? monthToIssue(profile, receivables) : null
  }
}
