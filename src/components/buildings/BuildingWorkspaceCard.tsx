import { isJourneyUnfinished } from '../../services/buildingJourney'
import { monthKeyOf, type BuildingSummary } from '../../services/buildingSummary'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../../types'
import { JALALI_MONTHS } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  buildingCardClass,
  buildingCardHeadClass,
  buildingCardTitleClass,
  buildingChipClass,
  buildingTileClass,
  buildingTilesClass,
  buildingTileValueClass,
  journeyRowMetaClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface BuildingWorkspaceCardProps {
  entry: SpreadsheetEntry
  /** Null while the first read is under way (or Sheets could not be reached). */
  summary: BuildingSummary | null
  onEnter: () => void
}

const fa = (value: number) => toPersianDigits(String(value))

/** Jalali month name of a `YYYY-MM` key. */
const monthName = (monthKey: string) => JALALI_MONTHS[Number(monthKey.split('-')[1]) - 1] ?? ''

/**
 * One building on the «مدیر ساختمان» home: name, units and members, three tiles (debtors, this
 * month's charge, the fund) and «ورود» (or «ادامه راه‌اندازی» while the setup journey is open).
 */
export default function BuildingWorkspaceCard({
  entry,
  summary,
  onEnter
}: BuildingWorkspaceCardProps) {
  const unfinished = !!summary && isJourneyUnfinished(summary.journey)

  const others = Math.max(0, (summary?.members ?? 0) - 1)

  const charge = summary?.charge

  const month = monthName(monthKeyOf())

  const percent =
    charge && charge.billed > 0 ? Math.round((charge.collected / charge.billed) * 100) : 0

  return (
    <Card className={buildingCardClass}>
      <div className={buildingCardHeadClass}>
        <div>
          <h2 className={buildingCardTitleClass}>{getSpreadsheetLabel(entry.name)}</h2>
          <p className={journeyRowMetaClass}>
            {summary
              ? `${fa(summary.units)} واحد · ${others ? `شما + ${fa(others)} عضو` : 'فقط شما'}`
              : 'در حال خواندن…'}
          </p>
        </div>
        {unfinished ? <span className={buildingChipClass}>راه‌اندازی نیمه‌کاره</span> : null}
      </div>

      {summary ? (
        <div className={buildingTilesClass}>
          <div className={buildingTileClass()}>
            <span>بدهکار {fa(summary.debtorUnits)} واحد</span>
            <span className={buildingTileValueClass}>
              {summary.debt ? <MoneyText amount={summary.debt} /> : '—'}
            </span>
          </div>
          {charge ? (
            <div className={buildingTileClass()}>
              <span>
                شارژ {month}: {fa(charge.paid)} از {fa(charge.issued)}
              </span>
              <span className={buildingTileValueClass}>وصول {fa(percent)}٪</span>
            </div>
          ) : (
            <div className={buildingTileClass(true)}>
              <span>شارژ {month} صادر نشده</span>
              <span className={buildingTileValueClass}>روز {fa(summary.issueDay)}</span>
            </div>
          )}
          <div className={buildingTileClass()}>
            <span>صندوق · {fa(summary.accounts)} حساب</span>
            <span className={buildingTileValueClass}>
              <MoneyText amount={summary.fundTotal} />
            </span>
          </div>
        </div>
      ) : null}

      <Button type="button" onClick={onEnter}>
        {unfinished ? 'ادامه راه‌اندازی' : 'ورود'}
      </Button>
    </Card>
  )
}
