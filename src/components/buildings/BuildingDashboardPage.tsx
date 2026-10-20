import { lazy, Suspense, useMemo, useState } from 'react'

import BuildingChargeBlock from './BuildingChargeBlock'
import BuildingFundHero from './BuildingFundHero'
import BuildingIssueCard from './BuildingIssueCard'
import BuildingSetupCard from './BuildingSetupCard'
import BuildingThisMonthBlock from './BuildingThisMonthBlock'
import BuildingUpcomingBlock from './BuildingUpcomingBlock'
import PickUnitSheet from './PickUnitSheet'
import QuickUnitsBuilderSheet from './QuickUnitsBuilderSheet'
import { useBuildingDashboard } from './useBuildingDashboard'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useRegisterPageSpeedDial, type PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { latestChargeMonth } from '../../services/buildingCharges'
import { isJourneyUnfinished, readJourney } from '../../services/buildingJourney'
import { monthKeyOf } from '../../services/buildingSummary'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import { JALALI_MONTHS } from '../../utils/jalaliDate'
import EmptyState from '../EmptyState'
import { DashboardSkeleton } from '../skeleton'
import {
  dashboardCalmPageClass,
  dashboardCellClass,
  dashboardGridClass
} from '../ui/dashboardCalmStyles'
import {
  speedDialActionExpenseClass,
  speedDialActionIncomeClass,
  speedDialTypeIconExpenseClass,
  speedDialTypeIconIncomeClass
} from '../ui/speedDialStyles'

// The payment sheet is Step 4's; it loads only when a payment is started.
const UnitPaymentSheet = lazy(() => import('./UnitPaymentSheet'))

const monthName = (monthKey: string) => JALALI_MONTHS[Number(monthKey.split('-')[1]) - 1] ?? ''

/**
 * The building dashboard, deliberately calm: the fund hero, one line for the latest charge month,
 * «پیش رو» (three rows) and «این ماه» (two links). The setup card and the «صدور نشده» card sit
 * above them when they apply. No bottom nav; the speed dial has two actions.
 */
export default function BuildingDashboardPage({ active = true }: { active?: boolean }) {
  const data = useBuildingDashboard()
  const { can } = useBuildingAccess()
  const [picking, setPicking] = useState(false)
  const [payUnit, setPayUnit] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)

  const canRecord = can('record')

  const actions = useMemo<PageSpeedDialAction[]>(
    () =>
      canRecord
        ? [
            {
              id: 'expense',
              label: 'ثبت هزینه',
              headerLabel: '− ثبت هزینه',
              icon: <span className={speedDialTypeIconExpenseClass}>−</span>,
              className: speedDialActionExpenseClass,
              onClick: () => useNavigationStore.getState().onOpenEntry('expense')
            },
            {
              id: 'charge-payment',
              label: 'ثبت واریزی شارژ',
              headerLabel: '+ ثبت واریزی شارژ',
              icon: <span className={speedDialTypeIconIncomeClass}>+</span>,
              className: speedDialActionIncomeClass,
              onClick: () => setPicking(true)
            }
          ]
        : [],
    [canRecord]
  )

  useRegisterPageSpeedDial(
    isConfigured() && actions.length ? { ariaLabel: 'عملیات ساختمان', actions } : null,
    active
  )

  if (!data.loaded || !data.profile) return <DashboardSkeleton />

  const { profile, units, receivables } = data

  const latest = latestChargeMonth(receivables)

  const journey = readJourney()

  // The first charge is the journey's own step; the card only nags once the journey is over.
  const issueMonth = data.monthToIssue && !isJourneyUnfinished(journey) ? data.monthToIssue : null

  return (
    <div className={dashboardCalmPageClass}>
      <BuildingSetupCard />
      {issueMonth && units.length ? (
        <BuildingIssueCard
          monthKey={issueMonth}
          issueDay={profile.issueDay}
          onIssued={() => void data.reload()}
        />
      ) : null}

      {!units.length ? (
        <EmptyState
          icon="building"
          message="واحدی تعریف نشده"
          description="اول واحدها را بساز تا شارژ و صورت‌حساب کار کند."
          action={
            can('people')
              ? { label: 'ساخت سریع واحدها', onClick: () => setBuilding(true) }
              : undefined
          }
        />
      ) : null}

      <div className={dashboardGridClass}>
        <BuildingFundHero
          className={dashboardCellClass.hero}
          accounts={data.accounts}
          flow={data.flow}
          monthName={monthName(monthKeyOf())}
        />
        {latest ? (
          <BuildingChargeBlock
            className={dashboardCellClass.upcoming}
            receivables={receivables}
            monthKey={latest}
            monthName={monthName(latest)}
          />
        ) : null}
        <BuildingUpcomingBlock className={dashboardCellClass.analysis} items={data.upcoming} />
        <BuildingThisMonthBlock
          className={dashboardCellClass.balance}
          expenseCount={data.flow.expenseCount}
          expenseTotal={data.flow.expense}
          owedToManager={data.owedToManager}
        />
      </div>

      <QuickUnitsBuilderSheet
        open={building}
        defaultFloors={profile.floors}
        onClose={() => setBuilding(false)}
        onCreated={() => {
          setBuilding(false)
          void data.reload()
        }}
      />
      <PickUnitSheet
        open={picking}
        data={data}
        onClose={() => setPicking(false)}
        onPick={unitId => {
          setPicking(false)
          setPayUnit(unitId)
        }}
      />
      {payUnit ? (
        <Suspense fallback={null}>
          <UnitPaymentSheet
            open
            unitId={payUnit}
            data={data}
            onClose={() => setPayUnit(null)}
            onSaved={() => {
              setPayUnit(null)
              void data.reload()
            }}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
