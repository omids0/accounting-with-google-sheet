import { lazy, Suspense } from 'react'

import BuildingBlock from './BuildingBlock'
import type { BuildingReport } from '../../services/buildingAssembly'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import DeferredMount from '../DeferredMount'
import MoneyText from '../MoneyText'
import {
  buildingRowTitleClass,
  buildingRowSubClass,
  buildingRowEndClass,
  buildingNoteClass,
  buildingEmptyClass,
  buildingDayBadgeClass
} from '../ui/buildingStyles'
import {
  calmDayBadgeDangerClass,
  calmListClass,
  calmRowClass,
  calmRowMainClass
} from '../ui/calmListStyles'

const LazySparkline = lazy(() => import('../charts/Sparkline'))

/** «جدول بدهکارها»: unit, name, months, amount and credit; tap opens the unit's statement. */
export function ReportDebtors({
  debtors,
  onOpenUnit
}: {
  debtors: BuildingReport['debtors']
  onOpenUnit: (unitId: string) => void
}) {
  return (
    <BuildingBlock
      title="جدول بدهکارها"
      badge={debtors.rows.length ? `· ${formatPersianNumber(debtors.rows.length)} واحد` : undefined}
    >
      {debtors.rows.length ? (
        <>
          <ul className={calmListClass}>
            {debtors.rows.map(row => (
              <li key={row.unitId} className={calmRowClass}>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-start"
                  onClick={() => onOpenUnit(row.unitId)}
                >
                  <span className={cn(buildingDayBadgeClass, calmDayBadgeDangerClass)}>
                    {toPersianDigits(row.unitNumber)}
                  </span>
                  <span className={calmRowMainClass}>
                    <span className={buildingRowTitleClass}>{row.name}</span>
                    <span className={buildingRowSubClass}>
                      {row.months.length ? row.months.join('، ') : 'بدهی قبلی یا سهم هزینه'}
                      {row.credit ? (
                        <>
                          {' · اعتبار '}
                          <MoneyText amount={row.credit} />
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span className={buildingRowEndClass}>
                    <MoneyText amount={row.amount} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className={buildingNoteClass}>
            جمع بدهی <MoneyText amount={debtors.total} />
            {debtors.credit ? (
              <>
                {' · اعتبار واحدها '}
                <MoneyText amount={debtors.credit} />
                {' (از بدهی کم نشده)'}
              </>
            ) : null}
          </p>
        </>
      ) : (
        <p className={buildingEmptyClass}>هیچ واحدی بدهکار نیست</p>
      )}
    </BuildingBlock>
  )
}

/** «روند صندوق»: the sum of the accounts at the end of each month, from the wallet ledger. */
export function ReportFundTrend({ fund }: { fund: BuildingReport['fund'] }) {
  const points = fund.series.filter(point => point.balance !== null)

  return (
    <BuildingBlock title="روند صندوق">
      {points.length > 1 ? (
        <DeferredMount>
          <Suspense fallback={null}>
            <LazySparkline
              data={points.map(point => point.balance ?? 0)}
              tone="primary"
              height={44}
            />
          </Suspense>
        </DeferredMount>
      ) : null}
      {points.length ? (
        <ul className={calmListClass}>
          {[...points].reverse().map(point => (
            <li key={point.monthKey} className={calmRowClass}>
              <div className={calmRowMainClass}>
                <span className={buildingRowTitleClass}>{point.label}</span>
              </div>
              <span className={buildingRowEndClass}>
                <MoneyText amount={point.balance ?? 0} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={buildingEmptyClass}>گردشی برای این بازه ثبت نشده</p>
      )}
      <p className={buildingNoteClass}>
        موجودی امروز <MoneyText amount={fund.total} />
        {fund.accounts.length ? ` · ${formatPersianNumber(fund.accounts.length)} حساب` : ''}
      </p>
    </BuildingBlock>
  )
}

/** «بدهی به مدیر و پیمانکاران»: what the building still owes. */
export function ReportDebts({ debts }: { debts: BuildingReport['debts'] }) {
  const rows = [
    ...(debts.manager ? [{ name: 'به مدیر', amount: debts.manager }] : []),
    ...debts.contractors
  ]

  return (
    <BuildingBlock title="بدهی به مدیر و پیمانکاران">
      {rows.length ? (
        <>
          <ul className={calmListClass}>
            {rows.map(row => (
              <li key={row.name} className={calmRowClass}>
                <div className={calmRowMainClass}>
                  <span className={buildingRowTitleClass}>{row.name}</span>
                </div>
                <span className={buildingRowEndClass}>
                  <MoneyText amount={row.amount} />
                </span>
              </li>
            ))}
          </ul>
          <p className={buildingNoteClass}>
            جمع <MoneyText amount={debts.total} />
          </p>
        </>
      ) : (
        <p className={buildingEmptyClass}>ساختمان بدهی ندارد</p>
      )}
    </BuildingBlock>
  )
}
