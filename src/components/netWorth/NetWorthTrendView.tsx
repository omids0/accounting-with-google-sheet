import { useState } from 'react'

import NetWorthEditModal from './NetWorthEditModal'
import NetWorthHero from './NetWorthHero'
import { netWorthMonthTitle, netWorthSourceLabel } from './netWorthLabels'
import NetWorthLineChart from './NetWorthLineChart'
import NetWorthTopMonths from './NetWorthTopMonths'
import { useNetWorthTrend } from './useNetWorthTrend'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { exportNetWorthCsv, importNetWorthCsv } from '../../services/netWorthSheet'
import type { NetWorthPoint } from '../../services/netWorthTrend'
import { cn } from '../../utils/cn'
import CalmBlock from '../CalmBlock'
import ConfirmActionModal from '../ConfirmActionModal'
import MoneyText from '../MoneyText'
import { Skeleton } from '../skeleton'
import Button from '../ui/Button'
import {
  calmDotClass,
  calmEmptyClass,
  calmListClass,
  calmNoteClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

function LegendRow({ label, dot, amount }: { label: string; dot: string; amount: number }) {
  return (
    <li className={calmRowClass}>
      <span className={cn(calmDotClass, dot)} aria-hidden="true" />
      <span className={cn(calmRowMainClass, calmRowTitleClass)}>{label}</span>
      <span className={calmRowEndClass}>
        <MoneyText amount={amount} />
      </span>
    </li>
  )
}

/** Values of the month picked on the chart, with «ویرایش» for a past month. */
function SelectedMonth({ point, onEdit }: { point: NetWorthPoint; onEdit: () => void }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] px-3 py-2">
      <div className="min-w-0 flex-1 text-[0.74rem] text-text" aria-live="polite">
        <div className="font-semibold">
          {netWorthMonthTitle(point.monthKey)}
          <span className="font-normal text-muted">{` · ${netWorthSourceLabel(
            point.source
          )}`}</span>
        </div>
        <div className="font-numeric tabular-nums">
          {'دارایی خالص '}
          <MoneyText amount={point.netWorth} />
          {' · بدهی '}
          <MoneyText amount={point.liabilities} />
        </div>
      </div>
      {point.source !== 'live' ? (
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          ویرایش
        </Button>
      ) : null}
    </div>
  )
}

/** «دارایی خالص» segment of `/charts`: hero, 12-month line, legend and the biggest months. */
export default function NetWorthTrendView() {
  const { trend, selected, setSelected } = useNetWorthTrend()
  const [editing, setEditing] = useState<NetWorthPoint | null>(null)
  const { handleExport, handleImport, importExportConfirmModal } = useSheetImportExport({
    exportFn: exportNetWorthCsv,
    importFn: importNetWorthCsv
  })

  if (!trend) {
    return (
      <CalmBlock title="۱۲ ماه اخیر">
        <div className="flex flex-col gap-3 py-2" aria-hidden="true">
          <Skeleton width="80%" height="0.9rem" />
          <Skeleton width="60%" height="0.9rem" />
        </div>
      </CalmBlock>
    )
  }

  const point = trend.points.find(item => item.monthKey === selected)

  return (
    <>
      <NetWorthHero trend={trend} />

      <CalmBlock title="۱۲ ماه اخیر">
        {trend.points.length > 1 ? (
          <NetWorthLineChart points={trend.points} selected={selected} onSelect={setSelected} />
        ) : (
          <p className={calmEmptyClass}>
            اولین ماه روند در ابتدای ماه بعد ثبت می‌شود؛ ماه‌های قبل یک بار از رکوردها ساخته
            می‌شوند.
          </p>
        )}
        {point ? <SelectedMonth point={point} onEdit={() => setEditing(point)} /> : null}
        <ul className={cn(calmListClass, 'mt-1')}>
          <LegendRow
            label="دارایی خالص"
            dot="bg-[var(--color-primary)]"
            amount={trend.today.netWorth}
          />
          <LegendRow
            label="بدهی‌های منتخب"
            dot="bg-[var(--color-expense)]"
            amount={trend.today.liabilities}
          />
        </ul>
      </CalmBlock>

      <NetWorthTopMonths title="بیشترین رشد" moves={trend.rises} />
      <NetWorthTopMonths title="بیشترین افت" moves={trend.falls} />

      <div className="flex flex-col gap-2">
        <p className={calmNoteClass}>
          هر ماه در برگه «دارایی ماهانه» ذخیره می‌شود. ماه‌های قبل از اولین ثبت از رکوردها ساخته
          شده‌اند (صندوقچه و هدف‌ها با قیمت امروز) و با «ویرایش» قابل اصلاح‌اند.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
            خروجی CSV
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleImport}>
            ورود از CSV
          </Button>
        </div>
      </div>

      <NetWorthEditModal point={editing} onClose={() => setEditing(null)} />
      <ConfirmActionModal {...importExportConfirmModal} />
    </>
  )
}
