import { lazy, Suspense } from 'react'

import type { BuildingReport } from '../../services/buildingAssembly'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import CalmBlock from '../CalmBlock'
import DeferredMount from '../DeferredMount'
import MoneyText from '../MoneyText'
import {
  calmDayBadgeClass,
  calmDayBadgeDangerClass,
  calmEmptyClass,
  calmListClass,
  calmNoteClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
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
    <CalmBlock
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
                  <span className={cn(calmDayBadgeClass, calmDayBadgeDangerClass)}>
                    {toPersianDigits(row.unitNumber)}
                  </span>
                  <span className={calmRowMainClass}>
                    <span className={calmRowTitleClass}>{row.name}</span>
                    <span className={calmRowSubClass}>
                      {row.months.length ? row.months.join('، ') : 'بدهی قبلی یا سهم هزینه'}
                      {row.credit ? (
                        <>
                          {' · اعتبار '}
                          <MoneyText amount={row.credit} />
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span className={calmRowEndClass}>
                    <MoneyText amount={row.amount} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className={calmNoteClass}>
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
        <p className={calmEmptyClass}>هیچ واحدی بدهکار نیست</p>
      )}
    </CalmBlock>
  )
}

/** «روند صندوق»: the sum of the accounts at the end of each month, from the wallet ledger. */
export function ReportFundTrend({ fund }: { fund: BuildingReport['fund'] }) {
  const points = fund.series.filter(point => point.balance !== null)

  return (
    <CalmBlock title="روند صندوق">
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
                <span className={calmRowTitleClass}>{point.label}</span>
              </div>
              <span className={calmRowEndClass}>
                <MoneyText amount={point.balance ?? 0} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={calmEmptyClass}>گردشی برای این بازه ثبت نشده</p>
      )}
      <p className={calmNoteClass}>
        موجودی امروز <MoneyText amount={fund.total} />
        {fund.accounts.length ? ` · ${formatPersianNumber(fund.accounts.length)} حساب` : ''}
      </p>
    </CalmBlock>
  )
}

/** «بدهی به مدیر و پیمانکاران»: what the building still owes. */
export function ReportDebts({ debts }: { debts: BuildingReport['debts'] }) {
  const rows = [
    ...(debts.manager ? [{ name: 'به مدیر', amount: debts.manager }] : []),
    ...debts.contractors
  ]

  return (
    <CalmBlock title="بدهی به مدیر و پیمانکاران">
      {rows.length ? (
        <>
          <ul className={calmListClass}>
            {rows.map(row => (
              <li key={row.name} className={calmRowClass}>
                <div className={calmRowMainClass}>
                  <span className={calmRowTitleClass}>{row.name}</span>
                </div>
                <span className={calmRowEndClass}>
                  <MoneyText amount={row.amount} />
                </span>
              </li>
            ))}
          </ul>
          <p className={calmNoteClass}>
            جمع <MoneyText amount={debts.total} />
          </p>
        </>
      ) : (
        <p className={calmEmptyClass}>ساختمان بدهی بازی ندارد</p>
      )}
    </CalmBlock>
  )
}
