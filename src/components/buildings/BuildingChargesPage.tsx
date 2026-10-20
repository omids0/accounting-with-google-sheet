import { lazy, Suspense, useMemo, useState } from 'react'

import BuildingIssueCard from './BuildingIssueCard'
import ChargeMonthCard from './ChargeMonthCard'
import ChargeMonthUnitsSheet from './ChargeMonthUnitsSheet'
import IssueChargesSheet from './IssueChargesSheet'
import { useBuildingSetupData } from './useBuildingSetupData'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { chargeMonthCard, chargeMonthKeys } from '../../services/buildingChargeMonths'
import { creditsOf, latestChargeMonth, missingIssueMonths } from '../../services/buildingCharges'
import { isJourneyUnfinished, readJourney } from '../../services/buildingJourney'
import { nextMonthKey } from '../../services/buildingMonths'
import { monthKeyOf } from '../../services/buildingSummary'
import { isConfigured } from '../../services/settings'
import { formatIsoDatePersian, getTodayIso } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import EmptyState from '../EmptyState'
import MoneyText from '../MoneyText'
import { DangCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import {
  calmListClass,
  calmNoteClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

// The payment sheet loads only when a payment is started.
const UnitPaymentSheet = lazy(() => import('./UnitPaymentSheet'))

/**
 * «شارژ»: one card per issued month (billed, collected, who is left), the guide card for a month
 * that is due, and the credit units hold. Tapping a month lists its units with a «ثبت پرداخت» per
 * debtor; the speed dial issues a month. An empty page offers «صدور اولین شارژ».
 */
export default function BuildingChargesPage({ active = true }: { active?: boolean }) {
  const data = useBuildingSetupData()
  const { can } = useBuildingAccess()
  const [issuing, setIssuing] = useState(false)
  const [month, setMonth] = useState<string | null>(null)
  const [payUnit, setPayUnit] = useState<string | null>(null)

  const canIssue = can('issue')

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات شارژ',
      actions: canIssue
        ? [
            {
              id: 'issue',
              label: 'صدور شارژ',
              headerLabel: '+ صدور شارژ',
              icon: <SpeedDialIcon name="add" />,
              onClick: () => setIssuing(true)
            }
          ]
        : []
    }),
    [canIssue]
  )

  useRegisterPageSpeedDial(isConfigured() && speedDial.actions.length ? speedDial : null, active)

  const { profile, units, receivables } = data

  const months = useMemo(() => chargeMonthKeys(receivables), [receivables])

  const credits = useMemo(() => {
    const numbers = new Map(units.map(unit => [unit.id, unit.number]))

    return creditsOf(receivables).map(item => ({
      ...item,
      number: numbers.get(item.unitId) ?? '؟'
    }))
  }, [receivables, units])

  if (!data.loaded || !profile) return <DangCardListSkeleton filterBar />

  const missing = isJourneyUnfinished(readJourney())
    ? null
    : missingIssueMonths(profile, receivables, getTodayIso())[0]

  const latest = latestChargeMonth(receivables)

  return (
    <div className={listModulePageClass}>
      {missing && units.length ? (
        <BuildingIssueCard
          monthKey={missing}
          issueDay={profile.issueDay}
          onIssued={() => void data.reload()}
        />
      ) : null}

      {months.length ? (
        months.map(key => (
          <ChargeMonthCard key={key} month={chargeMonthCard(receivables, key)} onOpen={setMonth} />
        ))
      ) : (
        <EmptyState
          icon="building"
          message="هنوز شارژی صادر نشده"
          description="شارژ ماه را صادر کن تا هر واحد صورت‌حساب خودش را داشته باشد."
          action={
            canIssue && units.length
              ? { label: 'صدور اولین شارژ', onClick: () => setIssuing(true) }
              : undefined
          }
        />
      )}

      {credits.length ? (
        <>
          <h2 className="m-0 text-[0.86rem] font-bold text-text">اعتبار واحدها</h2>
          <ul className={calmListClass}>
            {credits.map(item => (
              <li key={`${item.unitId}-${item.amount}`} className={calmRowClass}>
                <span className={calmRowMainClass}>
                  <span className={calmRowTitleClass}>واحد {toPersianDigits(item.number)}</span>
                  <span className={calmRowSubClass}>در صدور بعدی خودکار کسر می‌شود</span>
                </span>
                <span className={`${calmRowEndClass} text-success`}>
                  <MoneyText amount={item.amount} />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {months.length ? (
        <p className={calmNoteClass}>
          لمس هر ماه: وضعیت واحدها و ثبت پرداخت. امروز {formatIsoDatePersian(getTodayIso())} · صدور
          خودکار ماه‌های بعد با ورود مدیر به ساختمان انجام می‌شود.
        </p>
      ) : null}

      <IssueChargesSheet
        open={issuing}
        monthKey={missing ?? (latest ? nextMonthKey(latest) : monthKeyOf())}
        onClose={() => setIssuing(false)}
        onIssued={() => {
          setIssuing(false)
          void data.reload()
        }}
      />
      <ChargeMonthUnitsSheet
        monthKey={month}
        data={data}
        onClose={() => setMonth(null)}
        onPay={unitId => {
          setMonth(null)
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
